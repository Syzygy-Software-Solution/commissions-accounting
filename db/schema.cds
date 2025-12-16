namespace db;
using { cuid, managed } from '@sap/cds/common';

entity AmortizationSetup: cuid, managed{
    product: String;
    incentiveAmount: Decimal(15,2);
    capPercent: Integer;
    term: Integer;
    paymentFrequency: String;
    dataType: String;
    accountType: String;
    plan: String;
    payrollClassification: String;
    paymentStartDate: Date;
    paymentEndDate: Date;
    expenseStartDate: Date;
    expenseEndDate: Date;
}

entity AmortizationSchedule: cuid, managed{
    payeeId: String;
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

