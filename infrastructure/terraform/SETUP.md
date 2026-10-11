# Recreate the Kyool AWS infrastructure

This configuration preserves the service organization captured on 2026-03-02,
updated for a **new deployment after the old AWS infrastructure was deleted**.
It creates empty infrastructure. It does not import old IDs or restore data.
See [ARCHITECTURE.md](ARCHITECTURE.md) for captured facts and reconstruction choices.

## Local validation (no AWS resources)

Use Terraform 1.7+ for provider mocks, AWS provider 5.x, and the committed lock file.
Run from `infrastructure/terraform`:

```powershell
terraform init -backend=false
terraform fmt -check -recursive
terraform validate
terraform test
terraform -chdir=bootstrap init -backend=false
terraform -chdir=bootstrap validate
terraform -chdir=bootstrap test
```

`init` downloads providers. `test` uses mocked providers, including the global
alias: its simulated apply/destroy operations never contact AWS. No AWS credentials
are needed for these checks. This does not prove that an actual AWS deployment
will pass account permissions, quotas, DNS validation, or service availability.

## Configure a destination account

1. Configure an AWS CLI profile (`kyool` by default). Account IDs are detected
   from that profile; historical IDs are not reused.
2. Copy `production.tfvars.example` to `production.tfvars`. Fill in new secrets,
   destination domains, and the image URI. This file is gitignored.
3. Confirm `db_engine_version` is offered by RDS in the destination region.
   The default `15` requests the PostgreSQL 15 family, rather than the historical
   patch `15.13`, which may no longer be available for new instances.
4. Confirm CDN `content_path_patterns` against intended URLs and S3 object keys.
   CloudFront preserves the entire path: `pictures/example.webp` maps to that
   same key in the pictures bucket. The old cache path mappings were not captured.
5. Bucket names default to role/environment/account names. Override `bucket_names`
   only if those names are available. Do not assume deleted bucket names can be reclaimed.

Real applies below create billable resources, including RDS, a NAT gateway and
an Elastic IP. A single NAT is a reconstruction choice; it is not AZ-resilient.
No deployment is required just to keep the architectural record in Git.

## Create remote state

The bootstrap intentionally uses local state. Keep a secure copy of its state
outside Git after applying; it is needed to manage the state bucket/table later.

```powershell
terraform -chdir=bootstrap init
terraform -chdir=bootstrap plan
terraform -chdir=bootstrap apply
```

Copy `production.backend.hcl.example` to `production.backend.hcl`. Set `bucket`
from bootstrap's `state_bucket_name` output, plus the destination region/profile.
DynamoDB locking is retained for compatibility with the original bootstrap.

```powershell
terraform init -reconfigure -backend-config=production.backend.hcl
```

The backend key defaults to `production/terraform.tfstate`. Use a different key
and backend file for another environment. Never share one key between deployments.

## Request the certificate and prepare ECR

DNS stays at the existing external provider. These targeted operations are only
for the two first-deployment prerequisites; normal operation uses full plans.

```powershell
terraform plan -var-file=production.tfvars -target=module.certificates.aws_acm_certificate.kyool_eu -target=module.compute.aws_ecr_repository.main
terraform apply -var-file=production.tfvars -target=module.certificates.aws_acm_certificate.kyool_eu -target=module.compute.aws_ecr_repository.main
terraform output -json certificate_dns_records
terraform output -raw ecr_repository_url
```

Publish **all** output certificate CNAMEs at the external DNS provider. Preserve
existing email and other DNS records. Leave validation records in place for renewal.
The full apply waits for ACM validation; it will time out if CNAMEs are missing.

Build and push a Linux x86_64 Lambda-compatible image to the output ECR repository,
then set `lambda_image_uri` to its tag or digest. Lambda cannot be created from an
empty ECR repository. The repository's existing build/deploy scripts can be used,
but review their destination profile, account, subnet and role settings: they may
still contain historical configuration. Terraform does not run those scripts.

## Create the remaining infrastructure

```powershell
terraform plan -var-file=production.tfvars -out=rebuild.tfplan
terraform apply rebuild.tfplan
terraform output -json bucket_names
terraform output -json site_dns_records
terraform output -raw api_gateway_url
terraform output -raw backoffice_cloudfront_domain
```

Review the plan before applying. Populate the new S3 buckets with separately built
website/backoffice artifacts. Run Alembic migrations against the new empty database.
Update app/uploader settings to the new endpoints, bucket names and credentials.

At external DNS, point site subdomains to CloudFront using CNAME records. Apex
`kyool.eu`/`kyool.fr` need provider-supported ALIAS/ANAME or CNAME flattening.
The backoffice retains its CloudFront hostname. The API uses its generated
`execute-api` invoke URL, including `/production`. Do **not** point `api.kyool.eu`
at that hostname and expect TLS/routing to work: a custom API domain requires a
separate regional certificate and API Gateway domain/mapping, outside this snapshot.

## Ownership and limits

Terraform owns infrastructure/configuration; deploy scripts own later Lambda
image updates (`image_uri` is ignored after initial creation). Secret containers
are defined, but the current application still receives secrets as Lambda env vars.
Those values and the DB password are stored in Terraform state despite `sensitive`.
Protect both local/bootstrap and remote state; never commit it or plans.

CloudFront reads private site/files/pictures/backoffice buckets through OAC and
scoped bucket policies. Upload clients must use authenticated requests or presigned
URLs, not public ACLs or S3 website URLs. Existing upload tools may need adapting
if they depend on public ACLs. The API's storage configuration is a separate app
concern; creating buckets does not automatically configure those clients.

VPC, RDS and buckets have deletion guards. Intentional teardown requires reviewing
and removing Terraform `prevent_destroy` guards and disabling RDS deletion protection.
This is a reconstruction, not a verified byte-for-byte copy of the deleted account.
