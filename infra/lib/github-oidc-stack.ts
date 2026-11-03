import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';

export class GitHubOidcStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Proveedor OIDC: AWS confía en los tokens que emite GitHub Actions
    const provider = new iam.OpenIdConnectProvider(this, 'GitHubOidc', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
    });

    // Rol que GitHub asume. Solo desde este repo y la rama main
    const role = new iam.Role(this, 'GitHubDeployRole', {
      roleName: 'sandbox-cdk-github-deploy',
      maxSessionDuration: cdk.Duration.hours(1),
      assumedBy: new iam.WebIdentityPrincipal(provider.openIdConnectProviderArn, {
        StringEquals: { 'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com' },
        StringLike: {
          'token.actions.githubusercontent.com:sub': [
            'repo:angel-isasi@189562382/mini-onedrive-sandbox@1439585597:ref:refs/heads/main',
          ],
        },
      }),
    });

    // Solo puede asumir los roles del bootstrap de CDK (ellos hacen el deploy real)
    role.addToPolicy(new iam.PolicyStatement({
      actions: ['sts:AssumeRole'],
      resources: [`arn:aws:iam::${this.account}:role/cdk-hnb659fds-*`],
    }));

    new cdk.CfnOutput(this, 'GitHubDeployRoleArn', { value: role.roleArn });
  }
}