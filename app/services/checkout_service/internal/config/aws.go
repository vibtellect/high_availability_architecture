package config

import (
	"context"
	"net/url"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/sns"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
	"github.com/sirupsen/logrus"
)

// AWSConfig holds AWS service clients
type AWSConfig struct {
	SNSClient *sns.Client
	SQSClient *sqs.Client
	TopicARN  string
	Region    string
}

// NewAWSConfig creates and configures AWS clients for SNS and SQS
func NewAWSConfig(logger *logrus.Logger) (*AWSConfig, error) {
	cfg := LoadConfig()

	// Create AWS config
	var awsConfig aws.Config
	var err error

	// Configure for LocalStack or AWS
	if cfg.IsLocalStack() {
		logger.Info("Configuring AWS clients for LocalStack")

		// Parse endpoint URL to ensure it's valid
		endpointURL := cfg.AWSEndpoint
		if _, err := url.Parse(endpointURL); err != nil {
			logger.WithError(err).WithField("endpoint", endpointURL).Error("Invalid AWS endpoint URL")
			return nil, err
		}

		awsConfig, err = config.LoadDefaultConfig(context.TODO(),
			config.WithRegion(cfg.AWSRegion),
			config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
				cfg.AWSAccessKeyID,
				cfg.AWSSecretAccessKey,
				"",
			)),
			config.WithEndpointResolverWithOptions(aws.EndpointResolverWithOptionsFunc(
				func(service, region string, options ...interface{}) (aws.Endpoint, error) {
					return aws.Endpoint{
						URL:               endpointURL,
						HostnameImmutable: true,
					}, nil
				},
			)),
		)
	} else {
		logger.Info("Configuring AWS clients for production")
		awsConfig, err = config.LoadDefaultConfig(context.TODO(),
			config.WithRegion(cfg.AWSRegion),
		)
	}

	if err != nil {
		logger.WithError(err).Error("Failed to load AWS config")
		return nil, err
	}

	// Create SNS client
	snsClient := sns.NewFromConfig(awsConfig)

	// Create SQS client
	sqsClient := sqs.NewFromConfig(awsConfig)

	awsConfigStruct := &AWSConfig{
		SNSClient: snsClient,
		SQSClient: sqsClient,
		TopicARN:  cfg.SNSTopicARN,
		Region:    cfg.AWSRegion,
	}

	logger.WithFields(logrus.Fields{
		"region":     cfg.AWSRegion,
		"topicArn":   cfg.SNSTopicARN,
		"localstack": cfg.IsLocalStack(),
	}).Info("AWS configuration initialized successfully")

	return awsConfigStruct, nil
}
