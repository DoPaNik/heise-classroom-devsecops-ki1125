import * as pulumi from "@pulumi/pulumi";
import * as digitalocean from "@pulumi/digitalocean";
import * as cloudflare from "@pulumi/cloudflare";


const config = new pulumi.Config();
const cloudflareZoneId = config.get("cloudflareZoneId");
if (!cloudflareZoneId) {
    throw new Error("Pulumi config 'cloudflareZoneId' ist erforderlich, um den DNS-Eintrag bei Cloudflare zu erzeugen.");
}
const cloudflareApiToken = config.requireSecret("cloudflareApiToken");
const cloudflareProvider = new cloudflare.Provider("cloudflare", {
    apiToken: cloudflareApiToken,
});

const region = digitalocean.Region.FRA1;

const dropletTypeTag = new digitalocean.Tag("heise-n8n-demo");

const caddyfileParts: string[] = [];
// Lausche auf allen Interfaces auf Port 80 (HTTP)
// Für Produktion sollte hier eine echte Domain stehen
caddyfileParts.push(`heise-n8n.automatisier.bar {`);
caddyfileParts.push("    encode gzip zstd");
caddyfileParts.push("    reverse_proxy n8n:5678");
caddyfileParts.push("}");
const caddyfileContent = `${caddyfileParts.join("\n")}\n`;

// 1. Persistentes Volume für n8n-Daten
const n8nVolume = new digitalocean.Volume("n8n-data", {
    size: 25,                          // 25 GB; kann angepasst werden
    region: region,
    name: `heise-n8n-droplet-data`,
    initialFilesystemType: digitalocean.FileSystemType.EXT4,
    description: "Persistent volume for n8n data",
});

// 2. UserData (Cloud-init) zum Installieren von Docker, Mounten des Volumes und Starten von n8n via Docker Compose
// HINWEIS: Die DROPLET_IP wird beim ersten Boot automatisch erkannt
const userData = `#!/bin/bash
# Aktualisiere Pakete und installiere Docker + Docker Compose
apt-get update
apt-get install -y docker.io docker-compose
systemctl enable docker
systemctl start docker

# Volume mounten: DigitalOcean-Volumes erscheinen unter /dev/disk/by-id
DATA_DEVICE="/dev/disk/by-id/scsi-0DO_Volume_heise-n8n-droplet-data"
mkfs.ext4 -F \${DATA_DEVICE} || true
mkdir -p /data/n8n
mount \${DATA_DEVICE} /data/n8n
mkdir -p /data/n8n/caddy_data /data/n8n/caddy_config
# In /etc/fstab eintragen (damit das Volume nach Neustart gemountet wird)
echo "\${DATA_DEVICE} /data/n8n ext4 defaults,nofail 0 0" >> /etc/fstab

# Caddy-Konfiguration schreiben
cat > /data/n8n/caddy_config/Caddyfile <<'EOF'
${caddyfileContent}
EOF

# Ownership für Container (n8n & Caddy laufen als UID 1000) setzen
chown -R 1000:1000 /data/n8n

# Docker-Compose-Datei ablegen
mkdir -p /opt/n8n
cat > /opt/n8n/docker-compose.yml <<'EOF'
version: "3.8"
services:
  n8n:
    image: n8nio/n8n:latest
    container_name: n8n
    restart: always
    expose:
      - "5678"
    environment:
      - GENERIC_TIMEZONE=Europe/Berlin
      - N8N_PORT=5678
      # n8n läuft hinter Caddy Reverse Proxy
      - N8N_HOST=heise-n8n.automatisier.bar
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=https://heise-n8n.automatisier.bar/
      # Speicheroptimierungen
      - N8N_DEFAULT_BINARY_DATA_MODE=filesystem
      - EXECUTIONS_DATA_PRUNE=true
      - EXECUTIONS_DATA_MAX_AGE=720      # Tage, nach denen Ausführungen gelöscht werden
      - DB_SQLITE_VACUUM_ON_STARTUP=true
      # Benutzerverwaltung aktivieren
      - N8N_USER_MANAGEMENT=true
      - N8N_USER_INVITATION=true
    volumes:
      - n8n_data:/home/node/.n8n
  caddy:
    image: caddy:latest
    container_name: caddy
    restart: always
    depends_on:
      - n8n
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - caddy_config:/etc/caddy
      - caddy_data:/data
volumes:
  n8n_data:
    driver: local
    driver_opts:
      type: none
      device: /data/n8n
      o: bind
  caddy_data:
    driver: local
    driver_opts:
      type: none
      device: /data/n8n/caddy_data
      o: bind
  caddy_config:
    driver: local
    driver_opts:
      type: none
      device: /data/n8n/caddy_config
      o: bind
EOF

# Docker Compose starten
/usr/bin/docker-compose -f /opt/n8n/docker-compose.yml up -d
`;

// 3. Droplet erstellen
const droplet = new digitalocean.Droplet("n8n-droplet", {
    image: "ubuntu-24-04-x64",
    region: region,
    size: digitalocean.DropletSlug.DropletS2VCPU2GB,
    volumeIds: [n8nVolume.id],
    ipv6: false,
    monitoring: true,
    tags: [dropletTypeTag.id],
    userData: userData,
});

const n8nFirewall = new digitalocean.Firewall("n8n-firewall", {
    dropletIds: [droplet.id.apply(id => parseInt(id, 10))],
    inboundRules: [
        { protocol: "tcp", portRange: "22",  sourceAddresses: ["0.0.0.0/0", "::/0"] },    // SSH
        { protocol: "tcp", portRange: "80",  sourceAddresses: ["0.0.0.0/0", "::/0"] },    // HTTP (für Caddy / Nginx)
        { protocol: "tcp", portRange: "443", sourceAddresses: ["0.0.0.0/0", "::/0"] },    // HTTPS
        { protocol: "icmp", sourceAddresses: ["0.0.0.0/0", "::/0"] },                     // Ping
    ],
    outboundRules: [
        { protocol: "tcp", portRange: "0", destinationAddresses: ["0.0.0.0/0", "::/0"] },
        { protocol: "udp", portRange: "0", destinationAddresses: ["0.0.0.0/0", "::/0"] },
        { protocol: "icmp", destinationAddresses: ["0.0.0.0/0", "::/0"] },
    ],
});

new cloudflare.DnsRecord(`heise-n8n-cloudflare-record`, {
    zoneId: cloudflareZoneId,
    name: "heise-n8n.automatisier.bar",
    type: "A",
    content: droplet.ipv4Address,
    proxied: false,
    ttl: 300,
}, { provider: cloudflareProvider });

export const dropletIp = droplet.ipv4Address;
export const n8nUrl  = pulumi.interpolate`https://heise-n8n.automatisier.bar/`;
