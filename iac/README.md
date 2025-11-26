# IaC Setup - Modulare Struktur mit Security Policies

Dieses Setup verwendet Pulumi mit TypeScript für Infrastructure as Code und CrossGuard für Security-Policies.

## Struktur

```
iac/
├── index.ts              # Hauptdatei - orchestriert das Deployment
├── modules/
│   ├── n8n.ts           # n8n Deployment Modul
│   └── juiceShop.ts     # Juice Shop Deployment Modul
├── policy/
│   ├── index.ts         # CrossGuard Security Policies
│   ├── PulumiPolicy.yaml # Policy Pack Konfiguration
│   └── README.md        # Policy-Dokumentation
└── index.old.ts         # Backup der alten monolithischen Version
```

## Unabhängige Provisionierung

Du kannst n8n und Juice Shop unabhängig voneinander deployen:

### Nur n8n deployen
```bash
pulumi config set deployJuiceShop false
pulumi up
```

### Nur Juice Shop deployen
```bash
pulumi config set deployN8n false
pulumi up
```

### Beide Services deployen (Standard)
```bash
pulumi config set deployN8n true
pulumi config set deployJuiceShop true
pulumi up
```

## Erforderliche Konfiguration

### Basis-Konfiguration
```bash
pulumi config set cloudflareZoneId <your-zone-id>
pulumi config set --secret cloudflareApiToken <your-api-token>
```

### Optionale Security-Konfiguration

#### SSH-Keys hinzufügen (empfohlen!)
Erstelle zuerst einen SSH-Key bei DigitalOcean und nutze die ID:

```bash
# SSH-Key ID von DigitalOcean Dashboard kopieren
pulumi config set sshKeyId <your-ssh-key-id>
```

Dann in `index.ts` verwenden:
```typescript
const config = new pulumi.Config();
const sshKeyId = config.get("sshKeyId");

// Bei N8n/JuiceShop Deployment
sshKeys: sshKeyId ? [sshKeyId] : undefined,
```

#### SSH-Zugriff beschränken (empfohlen!)
```bash
# Deine öffentliche IP herausfinden
curl ifconfig.me

# In index.ts konfigurieren
allowedSshIps: ["DEINE-IP/32"]  // z.B. ["203.0.113.42/32"]
```

**Hinweis:** Ohne diese Konfiguration ist SSH für alle IPs offen (0.0.0.0/0)!

## Module

### n8n Modul
- Erstellt ein DigitalOcean Droplet mit n8n
- Verwendet Docker Compose mit Caddy als Reverse Proxy
- Persistentes 25GB Volume für Daten
- Firewall-Regeln für SSH, HTTP, HTTPS
- DNS-Eintrag bei Cloudflare: heise-n8n.automatisier.bar

### Juice Shop Modul
- Erstellt ein DigitalOcean Droplet mit OWASP Juice Shop
- Verwendet Docker Compose mit Caddy als Reverse Proxy
- Persistentes 10GB Volume für Daten
- Firewall-Regeln für SSH, HTTP, HTTPS
- DNS-Eintrag bei Cloudflare: saftladen.automatisier.bar

## Deployment

### Standard Deployment
```bash
cd iac
pulumi up
```

### Deployment mit Security Policies
```bash
cd iac
pulumi up --policy-pack policy/
```

Die Policies prüfen automatisch:
- ✅ Monitoring aktiviert
- ✅ Firewall-Konfiguration
- ✅ SSH-Zugriffsbeschränkungen
- ✅ Volume-Größen
- ✅ DNS-Konfiguration
- ✅ Naming Conventions

Siehe `policy/README.md` für Details zu allen Policies.

## Cleanup

Um alle Ressourcen zu entfernen:

```bash
pulumi destroy
```

## Security Best Practices

### CrossGuard Policies verwenden
Die integrierten CrossGuard Policies helfen dabei, Security Best Practices zu erzwingen:

```bash
# Preview mit Policy-Check
pulumi preview --policy-pack policy/

# Deployment mit Policy-Enforcement
pulumi up --policy-pack policy/
```

### SSH-Zugriff absichern
Bearbeite die Firewall-Regeln in den Modulen und beschränke SSH auf bekannte IPs:
```typescript
{ protocol: "tcp", portRange: "22", sourceAddresses: ["DEINE-IP/32"] }
```

### Monitoring nutzen
Alle Droplets haben Monitoring aktiviert. Nutze DigitalOcean Dashboard für:
- CPU/Memory-Überwachung
- Disk I/O Monitoring
- Network Traffic Analysis
