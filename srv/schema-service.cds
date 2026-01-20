namespace srv;
using { sz } from '../db/schema';

@path: '/amortization-srv'
service AmortizationService {
    entity AmortizationSetups as projection on sz.AmortizationSetup;
    entity AmortizationSchedules as projection on sz.AmortizationSchedule;
    entity DataSourceMappings as projection on sz.DataSourceMappings;

    type SetupInput: {
        product: String;
        capPercent: Integer;
        term: Integer;
        paymentFrequency: String;
        dataType: String;
        accountType: String;
        plan: String;
        payrollClassification: String;
        paymentStartDate: Date;
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

    action saveAmortizationSetup(setupData: array of SetupInput) returns String;
    action deleteAmortizationSetupByProduct(product: String) returns Boolean;
    action saveDataSourceMappings(mappingData: array of MappingInput) returns String;
}