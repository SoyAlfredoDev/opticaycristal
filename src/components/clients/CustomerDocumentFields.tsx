"use client";

import { documentIssuers, documentTypes, type DocumentFields, type DocumentType } from "@/lib/clients/customer-document";
import styles from "./ClientSpace.module.css";
import wizard from "./AdminSales.module.css";

export const blankDocument: DocumentFields = { documentType: "rut", documentCountry: "", documentNumber: "" };

export function CustomerDocumentTypeFields({ value, onChange, disabled }: {
  value: DocumentFields;
  onChange: (value: DocumentFields) => void;
  disabled: boolean;
}) {
  return <div className={wizard.documentOptions}>
    <label className={styles.field}>Tipo de documento
      <select className={styles.input} value={value.documentType} disabled={disabled}
        onChange={event => onChange({
          ...blankDocument, documentType: event.target.value as DocumentType,
        })}>
        {documentTypes.map(type => <option value={type.value} key={type.value}>{type.label}</option>)}
      </select>
    </label>
    {value.documentType !== "rut" && <label className={styles.field}>País emisor
      <select className={styles.input} value={value.documentCountry} required disabled={disabled}
        onChange={event => onChange({ ...value, documentCountry: event.target.value })}>
        <option value="">Selecciona un país</option>
        {documentIssuers.filter(country => value.documentType !== "national_id" || country.code !== "CL")
          .map(country => <option value={country.code} key={country.code}>{country.label}</option>)}
      </select>
    </label>}
  </div>;
}
