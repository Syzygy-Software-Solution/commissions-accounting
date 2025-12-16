namespace srv;
using { db } from '../db/schema';

@path: '/amortization-srv'
service AmortizationService {
    entity AmortizationSetups as projection on db.AmortizationSetup;
    entity AmortizationSchedules as projection on db.AmortizationSchedule;
}   