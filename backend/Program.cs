using CheckFillingAPI.Data;
using CheckFillingAPI.RealTime;
using CheckFillingAPI.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Net;
using System.Text;
using Microsoft.AspNetCore.HttpOverrides;

var builder = WebApplication.CreateBuilder(args);

// =======================
// KESTREL
// =======================
builder.WebHost.ConfigureKestrel(serverOptions =>
{
    serverOptions.ListenAnyIP(5001);
});

// =======================
// FORWARDED HEADERS (IIS FIX)
// =======================
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders =
        ForwardedHeaders.XForwardedFor |
        ForwardedHeaders.XForwardedProto;

    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// =======================
// SERVICES
// =======================
builder.Services.AddControllers();

builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = true;
});

builder.Services.AddEndpointsApiExplorer();

// =======================
// DATABASE (TON CODE INCHANGÉ)
// =======================
string? ResolveConnectionString(WebApplicationBuilder appBuilder)
{
    var connectionString = appBuilder.Configuration.GetConnectionString("DefaultConnection");

    if (string.IsNullOrWhiteSpace(connectionString))
    {
        var fallbackConfig = new ConfigurationBuilder()
            .SetBasePath(appBuilder.Environment.ContentRootPath)
            .AddJsonFile("appsettings.json", optional: true)
            .Build();
        connectionString = fallbackConfig.GetConnectionString("DefaultConnection");
    }

    if (string.IsNullOrWhiteSpace(connectionString))
    {
        var outputConfig = new ConfigurationBuilder()
            .SetBasePath(AppContext.BaseDirectory)
            .AddJsonFile("appsettings.json", optional: true)
            .Build();
        connectionString = outputConfig.GetConnectionString("DefaultConnection");
    }

    if (!string.IsNullOrWhiteSpace(connectionString))
    {
        appBuilder.Configuration["ConnectionStrings:DefaultConnection"] = connectionString;
    }

    return connectionString;
}

var resolvedConnectionString = ResolveConnectionString(builder);

Console.WriteLine($"[DEBUG] ResolvedConnectionString: '{resolvedConnectionString ?? "(null)"}'");

if (string.IsNullOrWhiteSpace(resolvedConnectionString))
{
    throw new InvalidOperationException("DefaultConnection must be configured");
}

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(resolvedConnectionString));

// =======================
// CORS (FIX RÉEL)
// =======================
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[]
    {
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://172.20.0.3"
    };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// =======================
// JWT AUTH (TON CODE)
// =======================
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("JWT Key not configured");

var key = Encoding.ASCII.GetBytes(jwtKey);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
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

    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;

            if (!string.IsNullOrEmpty(accessToken) &&
                path.StartsWithSegments("/hubs"))
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

// =======================
// SERVICES (TON CODE)
// =======================
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IBankService, BankService>();
builder.Services.AddScoped<ICheckService, CheckService>();
builder.Services.AddScoped<IAuditService, AuditService>();
builder.Services.AddScoped<ISupplierService, SupplierService>();

var app = builder.Build();

// =======================
// PIPELINE
// =======================

// IMPORTANT IIS
app.UseForwardedHeaders();

if (app.Environment.IsDevelopment())
{
    // Swagger désactivé
}

app.UseRouting();

// ⚠️ CORS (OBLIGATOIRE ICI)
app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

// =======================
// STATIC FILES (TON CODE)
// =======================
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        var origin = ctx.Context.Request.Headers["Origin"].ToString();

        if (!string.IsNullOrEmpty(origin))
        {
            ctx.Context.Response.Headers.Append("Access-Control-Allow-Origin", origin);
            ctx.Context.Response.Headers.Append("Access-Control-Allow-Credentials", "true");
            ctx.Context.Response.Headers.Append("Vary", "Origin");
        }
    }
});

// =======================
// CONTROLLERS
// =======================
app.MapControllers();

// =======================
// SIGNALR
// =======================
app.MapHub<CheckUpdatesHub>("/hubs/check-updates")
   .RequireCors("AllowFrontend");

// =======================
// DB MIGRATION
// =======================
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    //db.Database.Migrate();
}

app.Run();