import * as pulumi from "@pulumi/pulumi";
import * as digitalocean from "@pulumi/digitalocean";
import * as cloudflare from "@pulumi/cloudflare";

export interface N8nConfig {
    region: digitalocean.Region;
    domain: string;
    cloudflareZoneId: string;
    cloudflareProvider: cloudflare.Provider;
    volumeSize?: number;
    dropletSize?: digitalocean.DropletSlug;
    sshKeys?: pulumi.Input<string>[];
    allowedSshIps?: string[];
}

export class N8n extends pulumi.ComponentResource {
    public readonly dropletIp: pulumi.Output<string>;
    public readonly url: pulumi.Output<string>;
    public readonly droplet: digitalocean.Droplet;
    public readonly volume: digitalocean.Volume;

    constructor(name: string, args: N8nConfig, opts?: pulumi.ComponentResourceOptions) {
        super("heise:n8n:N8n", name, {}, opts);

        const tag = new digitalocean.Tag(`${name}-tag`, {
            name: "heise-n8n-demo",
        }, { parent: this });


        const caddyfileContent = `${args.domain} {
    encode gzip zstd
    reverse_proxy n8n:5678
}
`;

        this.volume = new digitalocean.Volume(`${name}-volume`, {
            size: args.volumeSize || 25,
            region: args.region,
            name: `heise-n8n-droplet-data`,
            initialFilesystemType: digitalocean.FileSystemType.EXT4,
            description: "Persistent volume for n8n data",
        }, { parent: this });

        const userData = `#!/bin/bash
apt-get update
apt-get install -y docker.io docker-compose
systemctl enable docker
systemctl start docker

DATA_DEVICE="/dev/disk/by-id/scsi-0DO_Volume_heise-n8n-droplet-data"
mkfs.ext4 -F \${DATA_DEVICE} || true
mkdir -p /data/n8n
mount \${DATA_DEVICE} /data/n8n
mkdir -p /data/n8n/caddy_data /data/n8n/caddy_config
echo "\${DATA_DEVICE} /data/n8n ext4 defaults,nofail 0 0" >> /etc/fstab

cat > /data/n8n/caddy_config/Caddyfile <<'EOF'
${caddyfileContent}
EOF

chown -R 1000:1000 /data/n8n

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
      - N8N_HOST=${args.domain}
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=https://${args.domain}/
      - N8N_DEFAULT_BINARY_DATA_MODE=filesystem
      - EXECUTIONS_DATA_PRUNE=true
      - EXECUTIONS_DATA_MAX_AGE=720
      - DB_SQLITE_VACUUM_ON_STARTUP=true
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

/usr/bin/docker-compose -f /opt/n8n/docker-compose.yml up -d
`;

        this.droplet = new digitalocean.Droplet(`${name}-droplet`, {
            image: "ubuntu-24-04-x64",
            region: args.region,
            size: args.dropletSize || digitalocean.DropletSlug.DropletS2VCPU2GB,
            volumeIds: [this.volume.id],
            ipv6: false,
            monitoring: true,
            tags: [tag.id],
            sshKeys: args.sshKeys,
            userData: userData,
        }, { parent: this });

        // Firewall mit eingeschränktem SSH-Zugriff
        const sshSourceAddresses = args.allowedSshIps || ["0.0.0.0/0", "::/0"];

        new digitalocean.Firewall(`${name}-firewall`, {
            dropletIds: [this.droplet.id.apply(id => parseInt(id, 10))],
            inboundRules: [
                { protocol: "tcp", portRange: "22", sourceAddresses: sshSourceAddresses },
                { protocol: "tcp", portRange: "80", sourceAddresses: ["0.0.0.0/0", "::/0"] },
                { protocol: "tcp", portRange: "443", sourceAddresses: ["0.0.0.0/0", "::/0"] },
                { protocol: "icmp", sourceAddresses: ["0.0.0.0/0", "::/0"] },
            ],
            outboundRules: [
                // HTTP/HTTPS für Package-Updates und Docker Images
                { protocol: "tcp", portRange: "80", destinationAddresses: ["0.0.0.0/0", "::/0"] },
                { protocol: "tcp", portRange: "443", destinationAddresses: ["0.0.0.0/0", "::/0"] },
                // DNS
                { protocol: "udp", portRange: "53", destinationAddresses: ["0.0.0.0/0", "::/0"] },
                { protocol: "tcp", portRange: "53", destinationAddresses: ["0.0.0.0/0", "::/0"] },
                // NTP für Zeitsynchronisation
                { protocol: "udp", portRange: "123", destinationAddresses: ["0.0.0.0/0", "::/0"] },
                // ICMP für Ping
                { protocol: "icmp", destinationAddresses: ["0.0.0.0/0", "::/0"] },
            ],
        }, { parent: this });

        new cloudflare.DnsRecord(`${name}-dns`, {
            zoneId: args.cloudflareZoneId,
            name: args.domain,
            type: "A",
            content: this.droplet.ipv4Address,
            proxied: false,
            ttl: 300,
        }, { provider: args.cloudflareProvider, parent: this });

        this.dropletIp = this.droplet.ipv4Address;
        this.url = pulumi.interpolate`https://${args.domain}/`;

        this.registerOutputs({
            dropletIp: this.dropletIp,
            url: this.url,
        });
    }
}
