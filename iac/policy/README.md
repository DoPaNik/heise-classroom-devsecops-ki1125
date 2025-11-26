# CrossGuard Security Policies

Diese Policy Pack enthält Security Best Practices für die DigitalOcean und Cloudflare Infrastruktur.

## Übersicht der Policies

### Mandatory Policies (müssen erfüllt sein)

1. **droplet-monitoring-required**
   - Alle Droplets müssen Monitoring aktiviert haben
   - Wichtig für Security-Überwachung und Incident Response

2. **volume-minimum-size**
   - Volumes müssen mindestens 1 GB groß sein
   - Verhindert versehentliche Erstellung zu kleiner Volumes

### Advisory Policies (Warnungen, aber nicht blockierend)

#### Droplet Security
- **droplet-ipv6-disabled**: IPv6 sollte deaktiviert sein (vereinfacht Firewall-Regeln)
- **droplet-ssh-keys-recommended**: SSH-Keys statt Passwörter verwenden
- **droplet-naming-convention**: Aussagekräftige Namen vergeben
- **droplet-size-cost-awareness**: Warnung bei teuren Droplet-Größen

#### Firewall Security
- **firewall-ssh-restricted**: SSH-Zugriff auf bekannte IPs beschränken
- **firewall-outbound-restricted**: Outbound-Traffic einschränken (Defense in Depth)
- **firewall-rule-documentation**: Aussagekräftige Namen für Firewalls

#### Volume Management
- **volume-backup-strategy**: Backup-Strategie dokumentieren
- **volume-size-cost-awareness**: Warnung bei sehr großen Volumes

#### DNS & Cloudflare
- **cloudflare-dns-ttl-reasonable**: Sinnvolle TTL-Werte (120s - 86400s)
- **cloudflare-proxy-consideration**: Cloudflare Proxy für DDoS-Schutz erwägen

#### Organisation
- **tag-required**: Tags für bessere Organisation verwenden

## Policy Pack verwenden

### Lokal testen
```bash
cd iac
pulumi preview --policy-pack policy/
```

### Bei Deployment anwenden
```bash
pulumi up --policy-pack policy/
```

### Policy Pack veröffentlichen (optional)
```bash
cd policy
pulumi policy publish
```

## Enforcement Levels

- **mandatory**: Deployment wird blockiert bei Verletzung
- **advisory**: Warnung wird ausgegeben, Deployment läuft weiter

## Best Practices

### SSH-Zugriff absichern
Statt `0.0.0.0/0` für SSH:
```typescript
inboundRules: [
    {
        protocol: "tcp",
        portRange: "22",
        sourceAddresses: ["203.0.113.0/24"]  // Deine IP-Range
    }
]
```

### Tags verwenden
```typescript
tags: [
    "environment:production",
    "service:n8n",
    "cost-center:team-a"
]
```

### Backup-Strategie dokumentieren
```typescript
new digitalocean.Volume("data", {
    size: 25,
    description: "Data volume with daily snapshots via DigitalOcean backup"
});
```

### Monitoring aktivieren
```typescript
new digitalocean.Droplet("app", {
    monitoring: true,  // Immer aktivieren!
    // ...
});
```

## Anpassungen

Du kannst die Policies in `policy/index.ts` anpassen:

1. **Enforcement Level ändern**: `advisory` ↔ `mandatory`
2. **Neue Policies hinzufügen**: Weitere `validateResourceOfType` Regeln
3. **Schwellwerte anpassen**: z.B. minimale Volume-Größe, TTL-Grenzen

## Beispiel-Output

```
Previewing update (dev)

Policy Violations:
    [advisory]  heise-security-policies v0.0.1  droplet-ssh-keys-recommended (heise-n8n-droplet: pulumi:pulumi:Stack)
    SSH-Keys sollten konfiguriert werden. Password-basierte Authentifizierung ist weniger sicher.

    [advisory]  heise-security-policies v0.0.1  firewall-ssh-restricted (heise-n8n-firewall: digitalocean:index/firewall:Firewall)
    SSH-Port 22 ist für alle IPs (0.0.0.0/0) offen. Beschränke SSH-Zugriff auf bekannte IPs für bessere Security.

    [mandatory]  heise-security-policies v0.0.1  droplet-monitoring-required (heise-n8n-droplet: digitalocean:index/droplet:Droplet)
    Droplet muss Monitoring aktiviert haben für Security-Überwachung
```

## Weitere Ressourcen

- [Pulumi CrossGuard Docs](https://www.pulumi.com/docs/guides/crossguard/)
- [Policy Pack Examples](https://github.com/pulumi/examples/tree/master/policy-packs)
- [DigitalOcean Security Best Practices](https://docs.digitalocean.com/products/getting-started/recommended-security/)
