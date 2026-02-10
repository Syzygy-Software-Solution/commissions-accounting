namespace srv;
using { sz } from '../db/schema';

@path: '/amortization-srv'
service AmortizationService {
    entity AmortizationSetups as projection on sz.AmortizationSetup;
    entity AmortizationSchedules as projection on sz.AmortizationSchedule;
    entity DataSourceMappings as projection on sz.DataSourceMappings;

    type SetupInput: {
        productId: String;
        productCategory: String;
        commissionsCategory: String;
        capPercent: Integer;
        term: Integer;
        amortizationFrequency: String;
        payrollClassification: String;
        amortizationStartMonth: String;
        genericAttribute1: String;
        genericNumber1: Integer;
        genericNumber2: Integer;
        genericBoolean1: Boolean;
        genericDate1: Date;
    }

    type MappingInput: {
        columnKey: String;
        columnName: String;
        defaultLabel: String;
        customLabel: String;
        position: Integer;
        tableName: String;
        fieldName: String;
        isActive: Boolean;
        connectViaAPI: Boolean;
    }

    type EmailAttachment: {
        filename: String;
        content: String; // base64 encoded
        contentType: String;
    }

    type EmailInput: {
        to: String;
        subject: String;
        body: String;
        attachment: EmailAttachment;
    }

    action saveAmortizationSetup(setupData: array of SetupInput) returns String;
    action deleteAmortizationSetupByProduct(productId: String) returns Boolean;
    action saveDataSourceMappings(mappingData: array of MappingInput) returns String;
    action sendEmail(to: String, subject: String, body: String, attachment: EmailAttachment) returns String;
}