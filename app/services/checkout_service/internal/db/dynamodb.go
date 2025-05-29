package db

import (
	"context"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/sirupsen/logrus"
)

type DynamoDBClient struct {
	Client *dynamodb.Client
	Logger *logrus.Logger
}

// NewDynamoDBClient creates a new DynamoDB client
func NewDynamoDBClient(logger *logrus.Logger) (*DynamoDBClient, error) {
	ctx := context.Background()
	
	// Check if running in local/development mode
	endpoint := os.Getenv("AWS_DYNAMODB_ENDPOINT")
	region := os.Getenv("AWS_REGION")
	if region == "" {
		region = "eu-central-1"
	}

	var cfg aws.Config
	var err error

	if endpoint != "" {
		// LocalStack configuration
		logger.WithFields(logrus.Fields{
			"endpoint": endpoint,
			"region":   region,
		}).Info("Configuring DynamoDB client for LocalStack")

		customResolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
			return aws.Endpoint{
				URL:           endpoint,
				SigningRegion: region,
			}, nil
		})

		cfg, err = config.LoadDefaultConfig(ctx,
			config.WithRegion(region),
			config.WithEndpointResolverWithOptions(customResolver),
			config.WithCredentialsProvider(credentials.StaticCredentialsProvider{
				Value: aws.Credentials{
					AccessKeyID:     "test",
					SecretAccessKey: "test",
					SessionToken:    "",
					Source:          "Static Credentials",
				},
			}),
		)
	} else {
		// AWS production configuration
		logger.WithField("region", region).Info("Configuring DynamoDB client for AWS")
		cfg, err = config.LoadDefaultConfig(ctx, config.WithRegion(region))
	}

	if err != nil {
		logger.WithError(err).Error("Failed to load AWS config")
		return nil, err
	}

	client := dynamodb.NewFromConfig(cfg)

	return &DynamoDBClient{
		Client: client,
		Logger: logger,
	}, nil
}

// HealthCheck verifies DynamoDB connectivity
func (d *DynamoDBClient) HealthCheck(ctx context.Context) error {
	_, err := d.Client.ListTables(ctx, &dynamodb.ListTablesInput{})
	if err != nil {
		d.Logger.WithError(err).Error("DynamoDB health check failed")
		return err
	}

	d.Logger.Debug("DynamoDB health check passed")
	return nil
}

// GetTableNames returns a list of all DynamoDB tables
func (d *DynamoDBClient) GetTableNames(ctx context.Context) ([]string, error) {
	result, err := d.Client.ListTables(ctx, &dynamodb.ListTablesInput{})
	if err != nil {
		d.Logger.WithError(err).Error("Failed to list DynamoDB tables")
		return nil, err
	}

	return result.TableNames, nil
} 