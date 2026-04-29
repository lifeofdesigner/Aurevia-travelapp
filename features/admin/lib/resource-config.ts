import type {
  AdminReferenceData,
  AdminResourceField,
  AdminResourceKey,
  AdminResourcePageData,
  AdminResourceRow
} from "@/features/admin/types";

type Translate = (key: string) => string;

function getOptionLabel(options: Array<{label: string; value: string}>, value: unknown) {
  const match = options.find((option) => option.value === value);
  return match?.label ?? (typeof value === "string" ? value : "-");
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((entry) => String(entry)) : [];
}

function asRow(record: Record<string, unknown>, cells: Record<string, string>): AdminResourceRow {
  return {
    cells,
    id: String(record.id),
    updatedAt: typeof record.updated_at === "string" ? record.updated_at : null,
    values: Object.fromEntries(
      Object.entries(record).map(([key, value]) => {
        if (Array.isArray(value)) {
          return [key, value.map((entry) => String(entry))];
        }

        if (
          value === null ||
          typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean"
        ) {
          return [key, value];
        }

        return [key, JSON.stringify(value ?? {}, null, 2)];
      })
    )
  };
}

export function buildAdminResourcePageData({
  commonT,
  records,
  references,
  resource
}: {
  commonT: Translate;
  records: Record<string, unknown>[];
  references: AdminReferenceData;
  resource: Exclude<AdminResourceKey, "customers">;
}): AdminResourcePageData {
  switch (resource) {
    case "destinations": {
      const fields: AdminResourceField[] = [
        {
          label: commonT("fields.slug"),
          name: "slug",
          required: true,
          type: "text"
        },
        {
          label: commonT("fields.title"),
          name: "title",
          required: true,
          type: "text"
        },
        {
          label: commonT("fields.destinationType"),
          name: "destination_type",
          options: [
            {label: commonT("destinationTypeOptions.city"), value: "city"},
            {label: commonT("destinationTypeOptions.country"), value: "country"},
            {label: commonT("destinationTypeOptions.airport"), value: "airport"},
            {label: commonT("destinationTypeOptions.region"), value: "region"}
          ],
          required: true,
          type: "select"
        },
        {
          label: commonT("fields.country"),
          name: "country_code",
          options: references.countries,
          required: true,
          type: "select"
        },
        {
          label: commonT("fields.city"),
          name: "city_id",
          options: references.cities,
          type: "select"
        },
        {
          label: commonT("fields.airport"),
          name: "airport_id",
          options: references.airports,
          type: "select"
        },
        {
          label: commonT("fields.summary"),
          name: "summary",
          type: "textarea"
        },
        {
          label: commonT("fields.heroImageUrl"),
          name: "hero_image_url",
          type: "text"
        },
        {
          label: commonT("fields.themeColor"),
          name: "theme_color",
          type: "text"
        },
        {
          label: commonT("fields.tags"),
          name: "tags",
          type: "tags"
        },
        {
          label: commonT("fields.sortOrder"),
          name: "sort_order",
          required: true,
          type: "number"
        },
        {
          label: commonT("fields.featured"),
          name: "is_featured",
          type: "checkbox"
        }
      ];

      return {
        allowCreate: true,
        allowDelete: true,
        allowEdit: true,
        columns: [
          {key: "title", label: commonT("columns.title")},
          {key: "type", label: commonT("columns.type")},
          {key: "country", label: commonT("columns.country")},
          {key: "featured", label: commonT("columns.featured")}
        ],
        fields,
        resource,
        rows: records.map((record) =>
          asRow(record, {
            country: getOptionLabel(references.countries, record.country_code),
            featured: record.is_featured ? commonT("boolean.yes") : commonT("boolean.no"),
            title: String(record.title ?? ""),
            type: String(record.destination_type ?? "")
          })
        )
      };
    }

    case "airports": {
      const fields: AdminResourceField[] = [
        {label: commonT("fields.name"), name: "name", required: true, type: "text"},
        {
          label: commonT("fields.iataCode"),
          name: "iata_code",
          required: true,
          type: "text"
        },
        {label: commonT("fields.icaoCode"), name: "icao_code", type: "text"},
        {
          label: commonT("fields.city"),
          name: "city_id",
          options: references.cities,
          required: true,
          type: "select"
        },
        {
          label: commonT("fields.country"),
          name: "country_code",
          options: references.countries,
          required: true,
          type: "select"
        },
        {label: commonT("fields.timeZone"), name: "time_zone", required: true, type: "text"},
        {label: commonT("fields.latitude"), name: "latitude", type: "number"},
        {label: commonT("fields.longitude"), name: "longitude", type: "number"},
        {label: commonT("fields.active"), name: "is_active", type: "checkbox"}
      ];

      return {
        allowCreate: true,
        allowDelete: true,
        allowEdit: true,
        columns: [
          {key: "name", label: commonT("columns.name")},
          {key: "iata", label: commonT("columns.code")},
          {key: "city", label: commonT("columns.city")},
          {key: "active", label: commonT("columns.active")}
        ],
        fields,
        resource,
        rows: records.map((record) =>
          asRow(record, {
            active: record.is_active ? commonT("boolean.yes") : commonT("boolean.no"),
            city: getOptionLabel(references.cities, record.city_id),
            iata: String(record.iata_code ?? ""),
            name: String(record.name ?? "")
          })
        )
      };
    }

    case "airlines": {
      const fields: AdminResourceField[] = [
        {label: commonT("fields.name"), name: "name", required: true, type: "text"},
        {
          label: commonT("fields.country"),
          name: "country_code",
          options: references.countries,
          type: "select"
        },
        {label: commonT("fields.iataCode"), name: "iata_code", type: "text"},
        {label: commonT("fields.icaoCode"), name: "icao_code", type: "text"},
        {label: commonT("fields.active"), name: "is_active", type: "checkbox"}
      ];

      return {
        allowCreate: true,
        allowDelete: true,
        allowEdit: true,
        columns: [
          {key: "name", label: commonT("columns.name")},
          {key: "country", label: commonT("columns.country")},
          {key: "codes", label: commonT("columns.code")},
          {key: "active", label: commonT("columns.active")}
        ],
        fields,
        resource,
        rows: records.map((record) =>
          asRow(record, {
            active: record.is_active ? commonT("boolean.yes") : commonT("boolean.no"),
            codes: [record.iata_code, record.icao_code].filter(Boolean).join(" / ") || "-",
            country: getOptionLabel(references.countries, record.country_code),
            name: String(record.name ?? "")
          })
        )
      };
    }

    case "featured-content": {
      const fields: AdminResourceField[] = [
        {label: commonT("fields.contentKey"), name: "content_key", required: true, type: "text"},
        {
          label: commonT("fields.locale"),
          name: "locale",
          options: [
            {label: "English", value: "en"},
            {label: "Deutsch", value: "de"}
          ],
          required: true,
          type: "select"
        },
        {
          label: commonT("fields.destination"),
          name: "destination_id",
          options: references.destinations,
          type: "select"
        },
        {label: commonT("fields.badge"), name: "badge", type: "text"},
        {label: commonT("fields.title"), name: "title", required: true, type: "text"},
        {label: commonT("fields.summary"), name: "summary", type: "textarea"},
        {label: commonT("fields.bodyMarkdown"), name: "body_markdown", type: "textarea"},
        {label: commonT("fields.ctaLabel"), name: "cta_label", type: "text"},
        {label: commonT("fields.ctaHref"), name: "cta_href", type: "text"},
        {label: commonT("fields.imageUrl"), name: "image_url", type: "text"},
        {label: commonT("fields.sortOrder"), name: "sort_order", required: true, type: "number"},
        {label: commonT("fields.publishStartsAt"), name: "publish_starts_at", type: "datetime-local"},
        {label: commonT("fields.publishEndsAt"), name: "publish_ends_at", type: "datetime-local"},
        {label: commonT("fields.published"), name: "is_published", type: "checkbox"}
      ];

      return {
        allowCreate: true,
        allowDelete: true,
        allowEdit: true,
        columns: [
          {key: "title", label: commonT("columns.title")},
          {key: "locale", label: commonT("columns.locale")},
          {key: "destination", label: commonT("columns.destination")},
          {key: "published", label: commonT("columns.published")}
        ],
        fields,
        resource,
        rows: records.map((record) =>
          asRow(record, {
            destination: getOptionLabel(references.destinations, record.destination_id),
            locale: String(record.locale ?? ""),
            published: record.is_published ? commonT("boolean.yes") : commonT("boolean.no"),
            title: String(record.title ?? "")
          })
        )
      };
    }

    case "legal": {
      const fields: AdminResourceField[] = [
        {
          label: commonT("fields.documentKey"),
          name: "document_key",
          options: [
            {label: commonT("documentKeyOptions.privacy_policy"), value: "privacy_policy"},
            {label: commonT("documentKeyOptions.terms_of_use"), value: "terms_of_use"},
            {label: commonT("documentKeyOptions.cookie_policy"), value: "cookie_policy"},
            {label: commonT("documentKeyOptions.refund_policy"), value: "refund_policy"}
          ],
          required: true,
          type: "select"
        },
        {
          label: commonT("fields.locale"),
          name: "locale",
          options: [
            {label: "English", value: "en"},
            {label: "Deutsch", value: "de"}
          ],
          required: true,
          type: "select"
        },
        {label: commonT("fields.version"), name: "version", required: true, type: "text"},
        {label: commonT("fields.title"), name: "title", required: true, type: "text"},
        {label: commonT("fields.summary"), name: "summary", type: "textarea"},
        {label: commonT("fields.bodyMarkdown"), name: "body_markdown", required: true, type: "textarea"},
        {
          label: commonT("fields.publicationStatus"),
          name: "publication_status",
          options: [
            {label: commonT("publicationStatusOptions.draft"), value: "draft"},
            {label: commonT("publicationStatusOptions.published"), value: "published"},
            {label: commonT("publicationStatusOptions.archived"), value: "archived"}
          ],
          required: true,
          type: "select"
        },
        {label: commonT("fields.effectiveAt"), name: "effective_at", required: true, type: "datetime-local"},
        {label: commonT("fields.publishedAt"), name: "published_at", type: "datetime-local"},
        {label: commonT("fields.checksum"), name: "checksum_sha256", type: "text"},
        {label: commonT("fields.currentDocument"), name: "is_current", type: "checkbox"}
      ];

      return {
        allowCreate: true,
        allowDelete: true,
        allowEdit: true,
        columns: [
          {key: "title", label: commonT("columns.title")},
          {key: "key", label: commonT("columns.documentKey")},
          {key: "locale", label: commonT("columns.locale")},
          {key: "status", label: commonT("columns.status")}
        ],
        fields,
        resource,
        rows: records.map((record) =>
          asRow(record, {
            key: String(record.document_key ?? ""),
            locale: String(record.locale ?? ""),
            status: `${String(record.publication_status ?? "")}${record.is_current ? ` • ${commonT("currentSuffix")}` : ""}`,
            title: String(record.title ?? "")
          })
        )
      };
    }

    case "visa-products": {
      const fields: AdminResourceField[] = [
        {label: commonT("fields.serviceCode"), name: "service_code", required: true, type: "text"},
        {label: commonT("fields.slug"), name: "slug", required: true, type: "text"},
        {label: commonT("fields.title"), name: "title", required: true, type: "text"},
        {label: commonT("fields.summary"), name: "summary", type: "textarea"},
        {label: commonT("fields.contentMarkdown"), name: "content_markdown", type: "textarea"},
        {label: commonT("fields.requirementSummary"), name: "requirement_summary", type: "textarea"},
        {
          label: commonT("fields.processingTimelineSummary"),
          name: "processing_timeline_summary",
          type: "textarea"
        },
        {
          label: commonT("fields.country"),
          name: "country_code",
          options: references.countries,
          required: true,
          type: "select"
        },
        {
          label: commonT("fields.locale"),
          name: "locale",
          options: [
            {label: "English", value: "en"},
            {label: "Deutsch", value: "de"}
          ],
          required: true,
          type: "select"
        },
        {
          label: commonT("fields.currency"),
          name: "currency_code",
          options: [
            {label: "EUR", value: "EUR"},
            {label: "USD", value: "USD"},
            {label: "GBP", value: "GBP"},
            {label: "AED", value: "AED"},
            {label: "NGN", value: "NGN"}
          ],
          required: true,
          type: "select"
        },
        {label: commonT("fields.priceFromMinor"), name: "price_from_minor", required: true, type: "number"},
        {label: commonT("fields.processingDaysMin"), name: "processing_days_min", type: "number"},
        {label: commonT("fields.processingDaysMax"), name: "processing_days_max", type: "number"},
        {label: commonT("fields.sortOrder"), name: "sort_order", required: true, type: "number"},
        {label: commonT("fields.supportsDependents"), name: "supports_dependents", type: "checkbox"},
        {label: commonT("fields.requirementsJson"), name: "requirements", type: "json"},
        {label: commonT("fields.metadataJson"), name: "metadata", type: "json"},
        {label: commonT("fields.published"), name: "is_published", type: "checkbox"}
      ];

      return {
        allowCreate: true,
        allowDelete: true,
        allowEdit: true,
        columns: [
          {key: "title", label: commonT("columns.title")},
          {key: "country", label: commonT("columns.country")},
          {key: "locale", label: commonT("columns.locale")},
          {key: "published", label: commonT("columns.published")}
        ],
        fields,
        resource,
        rows: records.map((record) =>
          asRow(record, {
            country: getOptionLabel(references.countries, record.country_code),
            locale: String(record.locale ?? ""),
            published: record.is_published ? commonT("boolean.yes") : commonT("boolean.no"),
            title: String(record.title ?? "")
          })
        )
      };
    }

    case "suppliers": {
      const fields: AdminResourceField[] = [
        {label: commonT("fields.code"), name: "code", required: true, type: "text"},
        {label: commonT("fields.name"), name: "name", required: true, type: "text"},
        {
          label: commonT("fields.serviceTypes"),
          name: "service_types",
          options: [
            {label: commonT("bookingTypeOptions.flight"), value: "flight"},
            {label: commonT("bookingTypeOptions.hotel"), value: "hotel"},
            {label: commonT("bookingTypeOptions.car_rental"), value: "car_rental"},
            {label: commonT("bookingTypeOptions.airport_transfer"), value: "airport_transfer"},
            {label: commonT("bookingTypeOptions.tour"), value: "tour"},
            {label: commonT("bookingTypeOptions.visa"), value: "visa"}
          ],
          required: true,
          type: "checkbox-group"
        },
        {label: commonT("fields.baseUrl"), name: "base_url", type: "text"},
        {label: commonT("fields.contactEmail"), name: "contact_email", type: "email"},
        {label: commonT("fields.configurationJson"), name: "configuration", type: "json"},
        {label: commonT("fields.active"), name: "is_active", type: "checkbox"}
      ];

      return {
        allowCreate: true,
        allowDelete: true,
        allowEdit: true,
        columns: [
          {key: "name", label: commonT("columns.name")},
          {key: "code", label: commonT("columns.code")},
          {key: "services", label: commonT("columns.services")},
          {key: "active", label: commonT("columns.active")}
        ],
        fields,
        resource,
        rows: records.map((record) =>
          asRow(record, {
            active: record.is_active ? commonT("boolean.yes") : commonT("boolean.no"),
            code: String(record.code ?? ""),
            name: String(record.name ?? ""),
            services: asStringArray(record.service_types).join(", ") || "-"
          })
        )
      };
    }

    case "coupons": {
      const fields: AdminResourceField[] = [
        {label: commonT("fields.code"), name: "code", required: true, type: "text"},
        {label: commonT("fields.description"), name: "description", type: "textarea"},
        {
          label: commonT("fields.discountType"),
          name: "discount_type",
          options: [
            {label: commonT("discountTypeOptions.fixed_amount"), value: "fixed_amount"},
            {label: commonT("discountTypeOptions.percentage"), value: "percentage"}
          ],
          required: true,
          type: "select"
        },
        {label: commonT("fields.amountMinor"), name: "amount_minor", type: "number"},
        {label: commonT("fields.percentageBps"), name: "percentage_bps", type: "number"},
        {
          label: "Minimum booking value (minor units)",
          name: "minimum_booking_value_minor",
          type: "number"
        },
        {
          label: commonT("fields.currency"),
          name: "currency_code",
          options: [
            {label: "EUR", value: "EUR"},
            {label: "USD", value: "USD"},
            {label: "GBP", value: "GBP"},
            {label: "AED", value: "AED"},
            {label: "NGN", value: "NGN"}
          ],
          type: "select"
        },
        {label: commonT("fields.maxRedemptions"), name: "max_redemptions", type: "number"},
        {
          label: commonT("fields.applicableBookingTypes"),
          name: "applicable_booking_types",
          options: [
            {label: commonT("bookingTypeOptions.flight"), value: "flight"},
            {label: commonT("bookingTypeOptions.hotel"), value: "hotel"},
            {label: commonT("bookingTypeOptions.car_rental"), value: "car_rental"},
            {label: commonT("bookingTypeOptions.airport_transfer"), value: "airport_transfer"},
            {label: commonT("bookingTypeOptions.tour"), value: "tour"},
            {label: commonT("bookingTypeOptions.visa"), value: "visa"}
          ],
          type: "checkbox-group"
        },
        {label: commonT("fields.startsAt"), name: "starts_at", type: "datetime-local"},
        {label: commonT("fields.endsAt"), name: "ends_at", type: "datetime-local"},
        {label: commonT("fields.metadataJson"), name: "metadata", type: "json"},
        {label: commonT("fields.active"), name: "is_active", type: "checkbox"}
      ];

      return {
        allowCreate: true,
        allowDelete: true,
        allowEdit: true,
        columns: [
          {key: "code", label: commonT("columns.code")},
          {key: "type", label: commonT("columns.type")},
          {key: "redemptions", label: commonT("columns.redemptions")},
          {key: "active", label: commonT("columns.active")}
        ],
        fields,
        resource,
        rows: records.map((record) =>
          asRow(record, {
            active: record.is_active ? commonT("boolean.yes") : commonT("boolean.no"),
            code: String(record.code ?? ""),
            redemptions: `${String(record.redemption_count ?? 0)} / ${String(record.max_redemptions ?? "∞")}`,
            type: String(record.discount_type ?? "")
          })
        )
      };
    }

    case "settings": {
      const fields: AdminResourceField[] = [
        {label: commonT("fields.settingKey"), name: "setting_key", required: true, type: "text"},
        {
          label: commonT("fields.localeOptional"),
          name: "locale",
          options: [
            {label: commonT("localeOptional.global"), value: ""},
            {label: "English", value: "en"},
            {label: "Deutsch", value: "de"}
          ],
          type: "select"
        },
        {label: commonT("fields.description"), name: "description", type: "textarea"},
        {label: commonT("fields.settingValueJson"), name: "setting_value", required: true, type: "json"},
        {label: commonT("fields.publicSetting"), name: "is_public", type: "checkbox"}
      ];

      return {
        allowCreate: true,
        allowDelete: true,
        allowEdit: true,
        columns: [
          {key: "key", label: commonT("columns.key")},
          {key: "locale", label: commonT("columns.locale")},
          {key: "public", label: commonT("columns.public")},
          {key: "description", label: commonT("columns.description")}
        ],
        fields,
        resource,
        rows: records.map((record) =>
          asRow(record, {
            description: String(record.description ?? "-"),
            key: String(record.setting_key ?? ""),
            locale: record.locale ? String(record.locale) : commonT("localeOptional.global"),
            public: record.is_public ? commonT("boolean.yes") : commonT("boolean.no")
          })
        )
      };
    }
  }
}
