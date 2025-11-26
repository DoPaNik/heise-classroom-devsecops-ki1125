import * as pulumi from "@pulumi/pulumi";
import * as digitalocean from "@pulumi/digitalocean";
import * as cloudflare from "@pulumi/cloudflare";
import { N8n } from "./modules/n8n";
import { JuiceShop } from "./modules/juiceShop";

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

// Config flags für unabhängiges Deployment
const deployN8n = config.getBoolean("deployN8n") ?? false;
const deployJuiceShop = config.getBoolean("deployJuiceShop") ?? false;

// SSH-Key und IP-Beschränkungen
const sshKeyId = config.get("sshKeyId");
const myPublicIp = config.get("myPublicIp");

// SSH-Keys Array (falls konfiguriert)
const sshKeys = sshKeyId ? [sshKeyId] : undefined;

// Erlaubte IPs für SSH (Default: alle, wenn nicht konfiguriert)
const allowedSshIps = myPublicIp ? [`${myPublicIp}/32`] : undefined;

// n8n deployment (conditional)
let n8nInstance: N8n | undefined;
let n8nUrl: pulumi.Output<string> | undefined;
let n8nDropletIp: pulumi.Output<string> | undefined;

if (deployN8n) {
    n8nInstance = new N8n("heise-n8n", {
        region: region,
        domain: "heise-n8n.automatisier.bar",
        cloudflareZoneId: cloudflareZoneId,
        cloudflareProvider: cloudflareProvider,
        volumeSize: 25,
        dropletSize: digitalocean.DropletSlug.DropletS2VCPU2GB,
        sshKeys: sshKeys,
        allowedSshIps: allowedSshIps,
    });
    n8nUrl = n8nInstance.url;
    n8nDropletIp = n8nInstance.dropletIp;
}

// Juice Shop deployment (conditional)
let juiceShopInstance: JuiceShop | undefined;
let juiceShopUrl: pulumi.Output<string> | undefined;
let juiceShopDropletIp: pulumi.Output<string> | undefined;

if (deployJuiceShop) {
    juiceShopInstance = new JuiceShop("heise-juice-shop", {
        region: region,
        domain: "saftladen.automatisier.bar",
        cloudflareZoneId: cloudflareZoneId,
        cloudflareProvider: cloudflareProvider,
        volumeSize: 1,
        dropletSize: digitalocean.DropletSlug.DropletS1VCPU512MB10GB,
        sshKeys: sshKeys,
        allowedSshIps: allowedSshIps,
    });
    juiceShopUrl = juiceShopInstance.url;
    juiceShopDropletIp = juiceShopInstance.dropletIp;
}

export const dropletIp = n8nDropletIp;
export { n8nUrl };
export { juiceShopDropletIp };
export { juiceShopUrl };
