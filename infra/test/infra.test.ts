import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { InfraStack } from '../lib/infra-stack';
import { GitHubOidcStack } from '../lib/github-oidc-stack';

const env = { account: '123456789012', region: 'us-east-1' };

describe('SandboxStack', () => {
  const app = new cdk.App();
  const template = Template.fromStack(new InfraStack(app, 'TestStack', { env }));

  test('tabla con PK/SK y GSI byParent', () => {
    template.hasResourceProperties('AWS::DynamoDB::GlobalTable', {
      KeySchema: [
        { AttributeName: 'userId', KeyType: 'HASH' },
        { AttributeName: 'itemId', KeyType: 'RANGE' },
      ],
      GlobalSecondaryIndexes: Match.arrayWith([
        Match.objectLike({ IndexName: 'byParent' }),
      ]),
    });
  });

  test('buckets privados', () => {
    template.allResourcesProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  test('15 Lambdas Node 24 arm64', () => {
    template.resourcePropertiesCountIs(
      'AWS::Lambda::Function',
      { Runtime: 'nodejs24.x', Architectures: ['arm64'] },
      15,
    );
  });

  test('17 rutas y todas protegidas con JWT', () => {
    const routes = template.findResources('AWS::ApiGatewayV2::Route');
    const list = Object.values(routes);
    expect(list).toHaveLength(17);
    list.forEach((r: any) => expect(r.Properties.AuthorizationType).toBe('JWT'));
  });

  test('Cognito solo por invitación', () => {
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      AdminCreateUserConfig: { AllowAdminCreateUserOnly: true },
    });
  });

  test('CloudFront con OAC y fallback SPA', () => {
    template.resourceCountIs('AWS::CloudFront::OriginAccessControl', 1);
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        CustomErrorResponses: Match.arrayWith([
          Match.objectLike({ ErrorCode: 404, ResponseCode: 200, ResponsePagePath: '/index.html' }),
        ]),
      }),
    });
  });
});

describe('GitHubOidcStack', () => {
  const app = new cdk.App();
  const template = Template.fromStack(new GitHubOidcStack(app, 'TestOidc', { env }));

  test('el rol solo acepta main de este repo', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Condition: Match.objectLike({
              StringLike: {
                'token.actions.githubusercontent.com:sub': [
                  'repo:angel-isasi@189562382/mini-onedrive-sandbox@1439585597:ref:refs/heads/main',
                ],
              },
            }),
          }),
        ]),
      }),
    });
  });
});