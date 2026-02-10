const cds = require('@sap/cds');
const nodemailer = require('nodemailer');

module.exports = cds.service.impl(async(srv) => {
    const { AmortizationSetups, AmortizationSchedules } = srv.entities;
    const db = await cds.connect.to('db');

    srv.on('saveAmortizationSetup', async (req) => {
        console.log('saveAmortizationSetup called');
        const setupData = req.data.setupData;
        console.log('Received setup data:', JSON.stringify(setupData));
        let updatedData = [];
        try {
            await db.run(DELETE.from('sz.AmortizationSetup'));
            console.log('Existing AmortizationSetup entries deleted.');
            await db.run(INSERT.into('sz.AmortizationSetup').entries(setupData));
            console.log('New AmortizationSetup entries inserted.');
            updatedData = await db.run(SELECT.from('sz.AmortizationSetup'));

        } catch (error) {
            req.error(500, `Error saving Amortization Setup: ${error.message}`);
        }
        return JSON.stringify(updatedData);
    });

    srv.on('deleteAmortizationSetupByProduct', async (req) => {
        console.log('deleteAmortizationSetupByProduct called');
        const deletionProduct = req.data.productId;
        console.log('Received setup data:', deletionProduct);
        let updatedData = [];
        try {
            await db.run(DELETE.from('sz.AmortizationSetup').where({ productId: deletionProduct }));
            console.log('Existing AmortizationSetup entries deleted.');
            updatedData = await db.run(SELECT.from('sz.AmortizationSetup'));
        } catch (error) {
            req.error(500, `Error deleting Amortization Setup: ${error.message}`);
        }
        return JSON.stringify(updatedData);
    });

    srv.on('saveDataSourceMappings', async (req) => {
        console.log('saveDataSourceMappings called');
        const mappingData = req.data.mappingData;
        console.log('Received mapping data:', JSON.stringify(mappingData));
        let updatedData = [];
        try {
            // Delete all existing mappings
            await db.run(DELETE.from('sz.DataSourceMappings'));
            console.log('Existing DataSourceMappings entries deleted.');
            
            // Insert new mappings
            await db.run(INSERT.into('sz.DataSourceMappings').entries(mappingData));
            console.log('New DataSourceMappings entries inserted.');
            
            // Return updated data
            updatedData = await db.run(SELECT.from('sz.DataSourceMappings'));
        } catch (error) {
            req.error(500, `Error saving Data Source Mappings: ${error.message}`);
        }
        return JSON.stringify(updatedData);
    });

    srv.on('sendEmail', async (req) => {
        console.log('sendEmail called');
        const { to, subject, body, attachment } = req.data;
        
        try {
            // Get mail destination configuration from BTP
            const mailDestination = await getMailDestination();
            
            console.log('Mail destination retrieved:', mailDestination ? 'Found' : 'Not found');
            
            if (!mailDestination) {
                req.error(500, 'Mail destination not configured. Please configure SMTP_MAIL destination in BTP.');
                return;
            }
            
            console.log('Connecting to SMTP:', mailDestination.host, ':', mailDestination.port);

            // Create transporter using destination credentials
            const transporter = nodemailer.createTransport({
                host: mailDestination.host,
                port: mailDestination.port || 587,
                secure: mailDestination.port === 465, // true for 465, false for other ports
                auth: {
                    user: mailDestination.user,
                    pass: mailDestination.password
                },
                tls: {
                    rejectUnauthorized: false // Allow self-signed certificates
                }
            });

            // Prepare email options
            const mailOptions = {
                from: mailDestination.from || mailDestination.user,
                to: to,
                subject: subject,
                text: body,
                html: `<p>${body.replace(/\n/g, '<br>')}</p>`
            };

            // Add attachment if provided
            if (attachment && attachment.content) {
                mailOptions.attachments = [{
                    filename: attachment.filename,
                    content: Buffer.from(attachment.content, 'base64'),
                    contentType: attachment.contentType
                }];
            }

            // Send email
            const info = await transporter.sendMail(mailOptions);
            console.log('Email sent successfully:', info.messageId);
            
            return JSON.stringify({ 
                success: true, 
                messageId: info.messageId,
                message: `Email sent successfully to ${to}` 
            });
            
        } catch (error) {
            console.error('Error sending email:', error);
            req.error(500, `Error sending email: ${error.message}`);
        }
    });
});

/**
 * Get mail destination configuration from BTP Destination Service
 * MAIL type destinations need to be fetched via REST API, not SDK
 */
async function getMailDestination() {
    const DESTINATION_NAME = 'SMTP_MAIL';
    
    try {
        const xsenv = require('@sap/xsenv');
        xsenv.loadEnv();
        
        // Get destination service credentials
        let destCredentials;
        try {
            const services = xsenv.getServices({ destination: { tag: 'destination' } });
            destCredentials = services.destination;
        } catch (e) {
            console.log('No destination service binding found');
        }
        
        if (destCredentials) {
            console.log('Destination service found, fetching MAIL destination...');
            
            // Get OAuth token from destination service
            const tokenResponse = await fetch(`${destCredentials.url}/oauth/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + Buffer.from(`${destCredentials.clientid}:${destCredentials.clientsecret}`).toString('base64')
                },
                body: 'grant_type=client_credentials'
            });
            
            if (!tokenResponse.ok) {
                console.error('Failed to get destination service token:', tokenResponse.status);
                throw new Error('Failed to authenticate with destination service');
            }
            
            const tokenData = await tokenResponse.json();
            const accessToken = tokenData.access_token;
            
            // Fetch the destination configuration
            const destResponse = await fetch(
                `${destCredentials.uri}/destination-configuration/v1/destinations/${DESTINATION_NAME}`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                }
            );
            
            if (!destResponse.ok) {
                console.error('Failed to fetch destination:', destResponse.status);
                throw new Error(`Destination ${DESTINATION_NAME} not found or not accessible`);
            }
            
            const destConfig = await destResponse.json();
            console.log('Destination config retrieved:', JSON.stringify(destConfig, null, 2));
            
            // Parse MAIL destination properties
            // For MAIL type destinations, properties are in destinationConfiguration
            const config = destConfig.destinationConfiguration || destConfig;
            
            // Also check authTokens for password (BTP sometimes provides credentials there)
            const authTokens = destConfig.authTokens || [];
            let passwordFromToken = null;
            if (authTokens.length > 0) {
                passwordFromToken = authTokens[0].value;
            }
            
            // Extract SMTP settings from destination properties
            // BTP MAIL destinations use different property names depending on configuration
            const mailConfig = {
                host: config['mail.smtp.host'] || config['mail.host'] || config.host,
                port: parseInt(config['mail.smtp.port'] || config['mail.port'] || config.port) || 587,
                user: config['mail.user'] || config['mail.smtp.user'] || config.User || config.user,
                password: config['mail.password'] || config.Password || config.password || passwordFromToken,
                from: config['mail.smtp.from'] || config['mail.from'] || config['mail.user'] || config.User || config.user
            };
            
            console.log('Parsed mail config - Host:', mailConfig.host, 'Port:', mailConfig.port, 'User:', mailConfig.user ? '***SET***' : 'NOT SET', 'Password:', mailConfig.password ? '***SET***' : 'NOT SET', 'From:', mailConfig.from);
            
            // Log all available keys for debugging
            console.log('Available config keys:', Object.keys(config));
            
            if (!mailConfig.host) {
                console.error('SMTP host not found in destination configuration');
                return null;
            }
            
            if (!mailConfig.user || !mailConfig.password) {
                console.error('SMTP credentials not found in destination configuration');
                console.error('Please ensure User and Password are set in the BTP destination');
                return null;
            }
            
            return mailConfig;
        }
        
        // Fall back to environment variables for local development
        console.log('Checking environment variables for SMTP config...');
        if (process.env.SMTP_HOST) {
            console.log('Using environment variables for SMTP');
            return {
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT) || 587,
                user: process.env.SMTP_USER,
                password: process.env.SMTP_PASSWORD,
                from: process.env.SMTP_FROM || process.env.SMTP_USER
            };
        }
        
        console.log('No mail configuration found');
        return null;
        
    } catch (error) {
        console.error('Error getting mail destination:', error);
        
        // Fall back to environment variables
        if (process.env.SMTP_HOST) {
            return {
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT) || 587,
                user: process.env.SMTP_USER,
                password: process.env.SMTP_PASSWORD,
                from: process.env.SMTP_FROM || process.env.SMTP_USER
            };
        }
        
        return null;
    }
}