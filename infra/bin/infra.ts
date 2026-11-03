#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { InfraStack } from '../lib/infra-stack';
import { GitHubOidcStack } from '../lib/github-oidc-stack';

const app = new cdk.App();

new InfraStack(app, 'SandboxStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'us-east-1' },
});

new GitHubOidcStack(app, 'GitHubOidcStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'us-east-1' },
});