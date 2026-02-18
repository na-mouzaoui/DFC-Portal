using CheckFillingAPI.Data;
using CheckFillingAPI.RealTime;
using CheckFillingAPI.Services;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using static System.Net.WebRequestMethods;

var builder = WebApplication.CreateBuilder(args);

// Configure Kestrel to listen on all network interfaces
builder.WebHost.ConfigureKestrel(serverOptions =>
{
    serverOptions.ListenAnyIP(5001); // Écoute sur 0.0.0.0:5001
});

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = true;
});
builder.Services.AddEndpointsApiExplorer();
// Swagger désactivé temporairement pour .NET 10
// builder.Services.AddSwaggerGen();

// Database
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("DefaultConnection must be configured in appsettings or environment variables");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString));

// CORS
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost", "http://127.0.0.1" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(origin => allowedOrigins.Any(o => origin.StartsWith(o))) // autorise tous les ports sur localhost
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key not configured");
var key = Encoding.ASCII.GetBytes(jwtKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false,
        ClockSkew = TimeSpan.Zero
    };

    // Allow JWT to be read from the HttpOnly cookie "jwt"
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;

            // Support SignalR (token via query string) and standard API calls (token via cookie)
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
                return Task.CompletedTask;
            }

            if (context.Request.Cookies.TryGetValue("jwt", out var token))
            {
                context.Token = token;
            }
            return Task.CompletedTask;
        }
    };
});

// Services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IBankService, BankService>();
builder.Services.AddScoped<ICheckService, CheckService>();
builder.Services.AddScoped<IAuditService, AuditService>();
builder.Services.AddScoped<ISupplierService, SupplierService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    // Swagger désactivé temporairement
    // app.UseSwagger();
    // app.UseSwaggerUI();
}

// Serve static files for uploaded PDFs
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        // Add CORS headers to static files
        var origin = ctx.Context.Request.Headers["Origin"].ToString();
        if (!string.IsNullOrEmpty(origin) && allowedOrigins.Any(o => origin.StartsWith(o)))
        {
            ctx.Context.Response.Headers.Append("Access-Control-Allow-Origin", origin);
            ctx.Context.Response.Headers.Append("Access-Control-Allow-Credentials", "true");
        }
    }
});

app.UseRouting();

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<CheckUpdatesHub>("/hubs/check-updates").RequireCors("AllowFrontend");

// Initialize database - Activé pour créer automatiquement la base de données
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    // Apply pending migrations or create database if missing
    db.Database.Migrate();
}

app.Run();
