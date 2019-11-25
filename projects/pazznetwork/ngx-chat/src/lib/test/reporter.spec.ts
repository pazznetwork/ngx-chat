import CustomReporter = jasmine.CustomReporter;

class CurrentSpecReporter implements CustomReporter {

    currentSpec: jasmine.CustomReporterResult;

    specStarted(result: jasmine.CustomReporterResult): void {
        this.currentSpec = result;
    }

}

export const currentSpecReporter = new CurrentSpecReporter();

jasmine.getEnv().addReporter(currentSpecReporter);
