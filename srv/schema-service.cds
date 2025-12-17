namespace srv;
using { db } from '../db/schema';

@path: '/amortization-srv'
service AmortizationService {
    entity AmortizationSetups as projection on db.AmortizationSetup;
    entity AmortizationSchedules as projection on db.AmortizationSchedule;

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

    action saveAmortizationSetup(setupData: array of SetupInput) returns String;
    action deleteAmortizationSetupByProduct(product: String) returns Boolean;
}