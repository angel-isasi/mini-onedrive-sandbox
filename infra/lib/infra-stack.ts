import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as path from 'path';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { HttpUserPoolAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Bucket de archivos de usuarios (igual al de consola)
    const filesBucket = new s3.Bucket(this, 'FilesBucket', {
      bucketName: 'sandbox-cdk-files-angel-2026',
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      cors: [
        {
          allowedOrigins: ['http://localhost:5173'],
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag'],
          maxAge: 3000,
        },
      ],
      lifecycleRules: [
        {
          id: 'cleanup-old-versions',
          noncurrentVersionExpiration: cdk.Duration.days(1),
          expiredObjectDeleteMarker: true,
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
        },
      ],
      // Sandbox: al borrar el stack, se borra el bucket con su contenido
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    new cdk.CfnOutput(this, 'FilesBucketName', { value: filesBucket.bucketName });

        // Tabla de metadatos (archivos y carpetas)
    const table = new dynamodb.TableV2(this, 'FilesTable', {
      tableName: 'sandbox-cdk-files',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'itemId', type: dynamodb.AttributeType.STRING },
      billing: dynamodb.Billing.onDemand(),
      globalSecondaryIndexes: [
        {
          indexName: 'byParent',
          partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
          sortKey: { name: 'parentId', type: dynamodb.AttributeType.STRING },
          projectionType: dynamodb.ProjectionType.ALL,
        },
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new cdk.CfnOutput(this, 'FilesTableName', { value: table.tableName });

        // Cognito: login solo por invitación
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'sandbox-cdk-users',
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      autoVerify: { email: true },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const userPoolClient = userPool.addClient('WebClient', {
      userPoolClientName: 'sandbox-cdk-web',
      generateSecret: false,
      authFlows: { userPassword: true, userSrp: true },
      idTokenValidity: cdk.Duration.minutes(60),
      accessTokenValidity: cdk.Duration.minutes(60),
      refreshTokenValidity: cdk.Duration.days(5),
    });

    new cognito.CfnUserPoolGroup(this, 'AdminsGroup', {
      userPoolId: userPool.userPoolId,
      groupName: 'admins',
    });

    new cdk.CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: userPoolClient.userPoolClientId });

        // ---------- Frontend: S3 + CloudFront ----------
    const webBucket = new s3.Bucket(this, 'WebBucket', {
      bucketName: 'sandbox-cdk-web-angel-2026',
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const distribution = new cloudfront.Distribution(this, 'WebDistribution', {
      comment: 'sandbox-cdk-web',
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(webBucket), // OAC
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      // Fallback SPA: rutas como /folders/123 devuelven index.html
      errorResponses: [403, 404].map((status) => ({
        httpStatus: status,
        responseHttpStatus: 200,
        responsePagePath: '/index.html',
        ttl: cdk.Duration.seconds(10),
      })),
    });

    const webUrl = `https://${distribution.distributionDomainName}`;

    // CORS del bucket de archivos: permitir también el dominio de CloudFront
    filesBucket.addCorsRule({
      allowedOrigins: [webUrl],
      allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
      allowedHeaders: ['*'],
      exposedHeaders: ['ETag'],
      maxAge: 3000,
    });

    // Sube frontend/dist al bucket e invalida CloudFront en cada deploy
    new s3deploy.BucketDeployment(this, 'DeployWeb', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../frontend/dist'))],
      destinationBucket: webBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    new cdk.CfnOutput(this, 'WebUrl', { value: webUrl });

        // ---------- Lambdas ----------
    // Helper: crea una Lambda a partir de backend/functions/<name>
    const fn = (name: string, timeoutSec = 10) =>
      new lambda.Function(this, name, {
        functionName: `sandbox-cdk-${name}`,
        runtime: lambda.Runtime.NODEJS_24_X,
        architecture: lambda.Architecture.ARM_64,
        handler: 'index.handler',
        code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/functions', name)),
        timeout: cdk.Duration.seconds(timeoutSec),
        environment: {
          TABLE_NAME: table.tableName,
          BUCKET_NAME: filesBucket.bucketName,
        },
      });

    const getUploadUrl = fn('get-upload-url');
    const getFiles = fn('get-files');
    const getDownloadUrl = fn('get-download-url');
    const deleteFiles = fn('delete-files');
    const createFolder = fn('create-folder');
    const getFolderPath = fn('get-folder-path');
    const getTrash = fn('get-trash');
    const restoreItem = fn('restore-item');
    const purgeItem = fn('purge-item', 30);
    const updateItem = fn('update-item');
    const getRecent = fn('get-recent');
    const search = fn('search');
    const getUsage = fn('get-usage');
    const multipart = fn('multipart', 30);
    const inviteUser = fn('invite-user');

    // ---------- Permisos ----------
    [getFiles, getDownloadUrl, getFolderPath, getTrash, getRecent, search, getUsage]
      .forEach((f) => table.grantReadData(f));
    [getUploadUrl, deleteFiles, createFolder, restoreItem, purgeItem, updateItem, multipart]
      .forEach((f) => table.grantReadWriteData(f));

    filesBucket.grantPut(getUploadUrl);
    filesBucket.grantPut(multipart); // incluye AbortMultipartUpload
    filesBucket.grantRead(getDownloadUrl);
    filesBucket.grantDelete(purgeItem);

    inviteUser.addEnvironment('USER_POOL_ID', userPool.userPoolId);
    userPool.grant(inviteUser, 'cognito-idp:AdminCreateUser');

    // ---------- API Gateway (HTTP API + JWT de Cognito) ----------
    const api = new apigw.HttpApi(this, 'Api', {
      apiName: 'sandbox-cdk-api',
      corsPreflight: {
        allowOrigins: ['http://localhost:5173', webUrl],
        allowMethods: [
          apigw.CorsHttpMethod.GET,
          apigw.CorsHttpMethod.POST,
          apigw.CorsHttpMethod.PATCH,
          apigw.CorsHttpMethod.DELETE,
          apigw.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ['content-type', 'authorization'],
        maxAge: cdk.Duration.minutes(5),
      },
      defaultAuthorizer: new HttpUserPoolAuthorizer('CognitoAuth', userPool, {
        userPoolClients: [userPoolClient],
      }),
    });

    const M = apigw.HttpMethod;
    const routes: [apigw.HttpMethod, string, lambda.Function][] = [
      [M.GET, '/files', getFiles],
      [M.POST, '/files/upload-url', getUploadUrl],
      [M.GET, '/files/{id}/download', getDownloadUrl],
      [M.DELETE, '/files/{id}', deleteFiles],
      [M.PATCH, '/files/{id}', updateItem],
      [M.POST, '/files/{id}/restore', restoreItem],
      [M.POST, '/files/multipart/start', multipart],
      [M.POST, '/files/multipart/complete', multipart],
      [M.POST, '/files/multipart/abort', multipart],
      [M.POST, '/folders', createFolder],
      [M.GET, '/folders/{id}/path', getFolderPath],
      [M.GET, '/trash', getTrash],
      [M.DELETE, '/trash/{id}', purgeItem],
      [M.GET, '/recent', getRecent],
      [M.GET, '/search', search],
      [M.GET, '/usage', getUsage],
      [M.POST, '/users/invite', inviteUser],
    ];

    routes.forEach(([method, routePath, handler]) => {
      api.addRoutes({
        path: routePath,
        methods: [method],
        integration: new HttpLambdaIntegration(`${method}${routePath}`, handler),
      });
    });

    new cdk.CfnOutput(this, 'ApiUrl', { value: api.apiEndpoint });
  }
}