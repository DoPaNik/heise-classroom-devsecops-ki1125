import * as pulumi from "@pulumi/pulumi";
import { PolicyPack, ResourceValidationPolicy, EnforcementLevel } from "@pulumi/policy";

/**
 * CrossGuard Policy Pack für DigitalOcean & Cloudflare Infrastruktur
 *
 * Erzwingt Security Best Practices:
 * - Firewall-Regeln validieren
 * - Monitoring aktiviert
 * - DNS-Konfiguration
 * - SSH-Zugriff eingeschränkt
 */

new PolicyPack("heise-security-policies", {
    policies: [
        {
            name: "droplet-monitoring-required",
            description: "Droplets müssen Monitoring aktiviert haben",
            enforcementLevel: "mandatory",
            validateResource: (args, reportViolation) => {
                if (args.type === "digitalocean:index/droplet:Droplet") {
                    if (!args.props.monitoring) {
                        reportViolation("Droplet muss Monitoring aktiviert haben für Security-Überwachung");
                    }
                }
            },
        },
        {
            name: "droplet-ipv6-disabled",
            description: "IPv6 sollte deaktiviert sein (Vereinfachung der Firewall-Regeln)",
            enforcementLevel: "advisory",
            validateResource: (args, reportViolation) => {
                if (args.type === "digitalocean:index/droplet:Droplet") {
                    if (args.props.ipv6) {
                        reportViolation("IPv6 sollte deaktiviert sein, um Firewall-Komplexität zu reduzieren");
                    }
                }
            },
        },
        {
            name: "droplet-ssh-keys-recommended",
            description: "SSH-Keys werden für sichere Authentifizierung empfohlen",
            enforcementLevel: "advisory",
            validateResource: (args, reportViolation) => {
                if (args.type === "digitalocean:index/droplet:Droplet") {
                    if (!args.props.sshKeys || args.props.sshKeys.length === 0) {
                        reportViolation(
                            "SSH-Keys sollten konfiguriert werden. " +
                            "Password-basierte Authentifizierung ist weniger sicher."
                        );
                    }
                }
            },
        },
        {
            name: "firewall-ssh-restricted",
            description: "SSH-Zugriff sollte auf bekannte IPs beschränkt sein",
            enforcementLevel: "advisory",
            validateResource: (args, reportViolation) => {
                if (args.type === "digitalocean:index/firewall:Firewall") {
                    if (args.props.inboundRules) {
                        for (const rule of args.props.inboundRules) {
                            if (rule.portRange === "22" && rule.sourceAddresses) {
                                const hasWildcard = rule.sourceAddresses.some(
                                    (addr: string) => addr === "0.0.0.0/0" || addr === "::/0"
                                );
                                if (hasWildcard) {
                                    reportViolation(
                                        "SSH-Port 22 ist für alle IPs (0.0.0.0/0) offen. " +
                                        "Beschränke SSH-Zugriff auf bekannte IPs für bessere Security. " +
                                        "Alternativ: VPN oder Bastion Host verwenden."
                                    );
                                }
                            }
                        }
                    }
                }
            },
        },
        {
            name: "firewall-outbound-restricted",
            description: "Outbound-Traffic sollte eingeschränkt sein",
            enforcementLevel: "advisory",
            validateResource: (args, reportViolation) => {
                if (args.type === "digitalocean:index/firewall:Firewall") {
                    if (args.props.outboundRules) {
                        for (const rule of args.props.outboundRules) {
                            if (rule.portRange === "0" || rule.portRange === "1-65535") {
                                reportViolation(
                                    "Outbound-Regel erlaubt alle Ports. " +
                                    "Erwäge spezifischere Regeln für Defense in Depth."
                                );
                            }
                        }
                    }
                }
            },
        },
        {
            name: "volume-backup-strategy",
            description: "Volumes sollten eine Backup-Strategie haben",
            enforcementLevel: "advisory",
            validateResource: (args, reportViolation) => {
                if (args.type === "digitalocean:index/volume:Volume") {
                    if (!args.props.description || !args.props.description.toLowerCase().includes("backup")) {
                        reportViolation(
                            "Volume sollte eine Backup-Strategie dokumentieren. " +
                            "Erwäge Snapshots oder externe Backups für Disaster Recovery."
                        );
                    }
                }
            },
        },
        {
            name: "volume-minimum-size",
            description: "Volumes sollten mindestens 1 GB haben",
            enforcementLevel: "mandatory",
            validateResource: (args, reportViolation) => {
                if (args.type === "digitalocean:index/volume:Volume") {
                    if (args.props.size < 1) {
                        reportViolation("Volume muss mindestens 1 GB groß sein");
                    }
                }
            },
        },
        {
            name: "cloudflare-dns-ttl-reasonable",
            description: "DNS TTL sollte sinnvolle Werte haben",
            enforcementLevel: "advisory",
            validateResource: (args, reportViolation) => {
                if (args.type === "cloudflare:index/dnsRecord:DnsRecord" || args.type === "cloudflare:index/record:Record") {
                    if (args.props.ttl && args.props.ttl < 120) {
                        reportViolation(
                            `DNS TTL von ${args.props.ttl} Sekunden ist sehr niedrig. ` +
                            "Erwäge höhere Werte (z.B. 300s) für bessere Performance."
                        );
                    }
                    if (args.props.ttl && args.props.ttl > 86400) {
                        reportViolation(
                            `DNS TTL von ${args.props.ttl} Sekunden ist sehr hoch. ` +
                            "Bei Änderungen kann es lange dauern, bis sie propagiert sind."
                        );
                    }
                }
            },
        },
        {
            name: "cloudflare-proxy-consideration",
            description: "Cloudflare Proxy für zusätzliche Security erwägen",
            enforcementLevel: "advisory",
            validateResource: (args, reportViolation) => {
                if (args.type === "cloudflare:index/dnsRecord:DnsRecord" || args.type === "cloudflare:index/record:Record") {
                    if (args.props.type === "A" && !args.props.proxied) {
                        reportViolation(
                            "A-Record ist nicht über Cloudflare Proxy geroutet. " +
                            "Erwäge Proxy-Modus für DDoS-Schutz und WAF-Features. " +
                            "(Nicht für alle Services sinnvoll - z.B. SSH)"
                        );
                    }
                }
            },
        },
        {
            name: "droplet-naming-convention",
            description: "Droplets sollten sinnvolle Namen haben",
            enforcementLevel: "advisory",
            validateResource: (args, reportViolation) => {
                if (args.type === "digitalocean:index/droplet:Droplet") {
                    if (!args.props.name || args.props.name.length < 3) {
                        reportViolation("Droplet sollte einen aussagekräftigen Namen haben (min. 3 Zeichen)");
                    }
                }
            },
        },
        {
            name: "tag-required",
            description: "Ressourcen sollten Tags für Organisation haben",
            enforcementLevel: "advisory",
            validateResource: (args, reportViolation) => {
                if (args.type === "digitalocean:index/droplet:Droplet") {
                    if (!args.props.tags || args.props.tags.length === 0) {
                        reportViolation(
                            "Droplet sollte Tags haben für bessere Organisation und Kostenübersicht. " +
                            "Z.B.: environment=production, service=n8n"
                        );
                    }
                }
            },
        },
        {
            name: "firewall-rule-documentation",
            description: "Firewall-Regeln sollten dokumentiert sein",
            enforcementLevel: "advisory",
            validateResource: (args, reportViolation) => {
                if (args.type === "digitalocean:index/firewall:Firewall") {
                    if (!args.props.name || args.props.name.length < 5) {
                        reportViolation(
                            "Firewall sollte einen aussagekräftigen Namen haben, " +
                            "der die Funktion beschreibt"
                        );
                    }
                }
            },
        },
        {
            name: "droplet-size-cost-awareness",
            description: "Warnung bei großen/teuren Droplet-Größen",
            enforcementLevel: "advisory",
            validateResource: (args, reportViolation) => {
                if (args.type === "digitalocean:index/droplet:Droplet") {
                    const expensiveSizes = [
                        "s-8vcpu-16gb",
                        "s-8vcpu-32gb",
                        "s-16vcpu-64gb",
                        "s-24vcpu-128gb",
                    ];
                    if (args.props.size && expensiveSizes.includes(args.props.size)) {
                        reportViolation(
                            `Droplet-Größe ${args.props.size} ist relativ teuer. ` +
                            "Stelle sicher, dass diese Ressourcen wirklich benötigt werden."
                        );
                    }
                }
            },
        },
        {
            name: "volume-size-cost-awareness",
            description: "Warnung bei sehr großen Volumes",
            enforcementLevel: "advisory",
            validateResource: (args, reportViolation) => {
                if (args.type === "digitalocean:index/volume:Volume") {
                    if (args.props.size > 100) {
                        reportViolation(
                            `Volume mit ${args.props.size} GB ist relativ groß. ` +
                            "Prüfe, ob diese Kapazität wirklich benötigt wird."
                        );
                    }
                }
            },
        },
    ],
});
