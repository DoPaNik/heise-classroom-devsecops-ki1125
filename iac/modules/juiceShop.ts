import * as pulumi from "@pulumi/pulumi";
import * as digitalocean from "@pulumi/digitalocean";
import * as cloudflare from "@pulumi/cloudflare";

export interface JuiceShopConfig {
    region: digitalocean.Region;
    domain: string;
    cloudflareZoneId: string;
    cloudflareProvider: cloudflare.Provider;
    volumeSize?: number;
    dropletSize?: digitalocean.DropletSlug;
    sshKeys?: pulumi.Input<string>[];
    allowedSshIps?: string[];
}

export class JuiceShop extends pulumi.ComponentResource {
    public readonly dropletIp: pulumi.Output<string>;
    public readonly url: pulumi.Output<string>;
    public readonly droplet: digitalocean.Droplet;
    public readonly volume: digitalocean.Volume;

    constructor(name: string, args: JuiceShopConfig, opts?: pulumi.ComponentResourceOptions) {
        super("heise:juiceshop:JuiceShop", name, {}, opts);

        const tag = new digitalocean.Tag(`${name}-tag`, {
            name: "heise-juice-shop-demo",
        }, { parent: this });

        const caddyfileContent = `${args.domain} {
    encode gzip zstd
    reverse_proxy juice-shop:3000
}
`;

        this.volume = new digitalocean.Volume(`${name}-volume`, {
            size: args.volumeSize || 1,
            region: args.region,
            name: `heise-juice-shop-droplet-data`,
            initialFilesystemType: digitalocean.FileSystemType.EXT4,
            description: "Persistent volume for Juice Shop data",
        }, { parent: this });

        const userData = `#!/bin/bash
apt-get update
apt-get install -y docker.io docker-compose
systemctl enable docker
systemctl start docker

DATA_DEVICE="/dev/disk/by-id/scsi-0DO_Volume_heise-juice-shop-droplet-data"
mkfs.ext4 -F \${DATA_DEVICE} || true
mkdir -p /data/juice-shop
mount \${DATA_DEVICE} /data/juice-shop
mkdir -p /data/juice-shop/caddy_data /data/juice-shop/caddy_config
echo "\${DATA_DEVICE} /data/juice-shop ext4 defaults,nofail 0 0" >> /etc/fstab

cat > /data/juice-shop/caddy_config/Caddyfile <<'EOF'
${caddyfileContent}
EOF

chown -R 1000:1000 /data/juice-shop

mkdir -p /opt/juice-shop
cat > /opt/juice-shop/docker-compose.yml <<'EOF'
version: "3.8"
services:
  juice-shop:
    image: bkimminich/juice-shop:latest
    container_name: juice-shop
    restart: always
    expose:
      - "3000"
    environment:
      - NODE_ENV=unsafe
  caddy:
    image: caddy:latest
    container_name: caddy
    restart: always
    depends_on:
      - juice-shop
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - caddy_config:/etc/caddy
      - caddy_data:/data
volumes:
  caddy_data:
    driver: local
    driver_opts:
      type: none
      device: /data/juice-shop/caddy_data
      o: bind
  caddy_config:
    driver: local
    driver_opts:
      type: none
      device: /data/juice-shop/caddy_config
      o: bind
EOF

/usr/bin/docker-compose -f /opt/juice-shop/docker-compose.yml up -d
`;

        this.droplet = new digitalocean.Droplet(`${name}-droplet`, {
            image: "ubuntu-24-04-x64",
            region: args.region,
            size: args.dropletSize || digitalocean.DropletSlug.DropletS1VCPU512MB10GB,
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
