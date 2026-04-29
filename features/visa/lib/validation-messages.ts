type TranslationFunction = (key: string) => string;

export function getVisaCatalogSearchMessages(t: TranslationFunction) {
  return {
    countryRequired: t("validation.countryRequired"),
    travelDateRequired: t("validation.dateRequired")
  };
}

export function getVisaApplicationValidationMessages(t: TranslationFunction) {
  return {
    acknowledgementsRequired: t("validation.acknowledgementsRequired"),
    companionDateRequired: t("validation.companionDateRequired"),
    companionNameRequired: t("validation.companionNameRequired"),
    companionRelationshipRequired: t("validation.companionRelationshipRequired"),
    dateOfBirthRequired: t("validation.dateOfBirthRequired"),
    departureAfterArrival: t("validation.departureAfterArrival"),
    destinationRequired: t("validation.destinationRequired"),
    emailInvalid: t("validation.emailInvalid"),
    emailRequired: t("validation.emailRequired"),
    firstNameRequired: t("validation.firstNameRequired"),
    lastNameRequired: t("validation.lastNameRequired"),
    nationalityRequired: t("validation.nationalityRequired"),
    passportCountryRequired: t("validation.passportCountryRequired"),
    passportExpiryAfterDeparture: t("validation.passportExpiryAfterDeparture"),
    passportExpiryRequired: t("validation.passportExpiryRequired"),
    passportIssuedBeforeExpiry: t("validation.passportIssuedBeforeExpiry"),
    passportIssuedRequired: t("validation.passportIssuedRequired"),
    passportNumberRequired: t("validation.passportNumberRequired"),
    phoneInvalid: t("validation.phoneInvalid"),
    purposeRequired: t("validation.purposeRequired"),
    residencyAddressRequired: t("validation.residencyAddressRequired"),
    residencyCityRequired: t("validation.residencyCityRequired"),
    residencyCountryRequired: t("validation.residencyCountryRequired"),
    residencyStatusRequired: t("validation.residencyStatusRequired"),
    tooManyCompanions: t("validation.tooManyCompanions"),
    travelDateRequired: t("validation.travelDateRequired")
  };
}
