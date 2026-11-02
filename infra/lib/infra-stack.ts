import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

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
  }
}