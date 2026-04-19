namespace CheckFillingAPI.Models;

public class FiscalPeriode
{
    public int Id { get; set; }
    public int Mois { get; set; }
    public int Annee { get; set; }

    public ICollection<FiscalDeclarationHeader> Declarations { get; set; } = new List<FiscalDeclarationHeader>();
}

public class FiscalDeclarationHeader
{
    public int Id { get; set; }
    public int PeriodeId { get; set; }
    public string Direction { get; set; } = string.Empty;
    public string TableauCode { get; set; } = string.Empty;
    public string Statut { get; set; } = "PENDING";
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();

    public FiscalPeriode Periode { get; set; } = null!;
}
