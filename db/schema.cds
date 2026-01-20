namespace sz;
using { cuid, managed } from '@sap/cds/common';

entity AmortizationSetup: cuid, managed{
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

entity AmortizationSchedule: cuid, managed{
    payeeId: String;
    orderId: String;
    product: String;
    incentiveAmount: Decimal(15,2);
    capPercent: Integer;
    term: Integer;
    paymentFrequency: String;
    dataType: String;
    accountType: String;
    plan: String;
    payrollClassification: String;
    expenseStartDate: Date;
    expenseEndDate: Date;
    notes: String;
}

entity DataSourceMappings: cuid, managed{
    isActive: Boolean;
    columnKey: String;
    columnName: String;
    position: Integer;
    defaultLabel: String;
    customLabel: String;
    tableName: String;
    fieldName: String;
    connectViaAPI: Boolean;
}

