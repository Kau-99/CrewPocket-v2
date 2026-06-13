import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { formatCents } from "@/lib/utils";

/**
 * PDF comum de estimate/invoice (SPEC §8): logo + dados da empresa,
 * número, cliente, tabela de itens, subtotal/desconto/tax/total, notas,
 * validade/vencimento. Todas as strings chegam traduzidas pelo chamador.
 * Renderizado APENAS via import dinâmico (lib/pdf-actions).
 */
export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string | null;
  website?: string;
  taxId?: string;
  licenseNumber?: string;
}

export interface PdfLine {
  id: string;
  description: string;
  qty: number;
  unitPriceCents: number;
  unit?: string;
  note?: string;
}

export interface DocumentPdfProps {
  heading: string;
  number: string;
  company: CompanyInfo;
  clientLabel: string;
  clientName: string;
  dateLabel: string;
  dateValue: string;
  columns: { description: string; qty: string; price: string; total: string };
  lines: PdfLine[];
  totals: { subtotalCents: number; discountCents: number; taxCents: number; totalCents: number };
  totalsLabels: { subtotal: string; discount: string; tax: string; total: string };
  notesLabel: string;
  notes: string;
  /** Opcionais (estimate): depósito devido, termos, assinatura. */
  deposit?: { label: string; cents: number };
  terms?: { label: string; value: string };
  signature?: { label: string; dataUrl: string; name: string };
  /** Opcional (invoice): instruções de pagamento. */
  payment?: { label: string; value: string };
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#111827" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  heading: { fontSize: 20, fontFamily: "Helvetica-Bold" },
  number: { fontSize: 12, color: "#6b7280", marginTop: 4 },
  company: { textAlign: "right", lineHeight: 1.4 },
  companyName: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  companyMeta: { fontSize: 8, color: "#6b7280" },
  logo: { width: 64, height: 64, objectFit: "contain", marginBottom: 6, alignSelf: "flex-end" },
  metaRow: { flexDirection: "row", gap: 32, marginBottom: 16 },
  metaLabel: { color: "#6b7280", marginBottom: 2 },
  table: { marginTop: 8 },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#111827",
    paddingBottom: 4,
    fontFamily: "Helvetica-Bold",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 5,
  },
  colDescription: { flex: 1, paddingRight: 8 },
  colQty: { width: 50, textAlign: "right" },
  colPrice: { width: 80, textAlign: "right" },
  colTotal: { width: 80, textAlign: "right" },
  totalsBlock: { marginTop: 12, alignSelf: "flex-end", width: 220 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  totalsFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#111827",
    marginTop: 4,
    paddingTop: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
  },
  notes: { marginTop: 24, color: "#374151", lineHeight: 1.4 },
  notesLabel: { fontFamily: "Helvetica-Bold", marginBottom: 4 },
  lineNote: { fontSize: 8, color: "#6b7280", marginTop: 1 },
  signature: { marginTop: 24 },
  signatureImg: { width: 180, height: 60, objectFit: "contain", marginTop: 4 },
});

export function DocumentPdf(props: DocumentPdfProps) {
  const { company, totals, totalsLabels, columns } = props;
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.heading}>{props.heading}</Text>
            <Text style={styles.number}>{props.number}</Text>
          </View>
          <View style={styles.company}>
            {company.logoUrl && (
              // eslint-disable-next-line jsx-a11y/alt-text -- Image do react-pdf não é <img> HTML; não existe prop alt
              <Image src={company.logoUrl} style={styles.logo} />
            )}
            <Text style={styles.companyName}>{company.name}</Text>
            {company.address ? <Text>{company.address}</Text> : null}
            {company.phone ? <Text>{company.phone}</Text> : null}
            {company.email ? <Text>{company.email}</Text> : null}
            {company.website ? <Text>{company.website}</Text> : null}
            {company.taxId ? <Text style={styles.companyMeta}>{company.taxId}</Text> : null}
            {company.licenseNumber ? (
              <Text style={styles.companyMeta}>{company.licenseNumber}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.metaRow}>
          <View>
            <Text style={styles.metaLabel}>{props.clientLabel}</Text>
            <Text>{props.clientName || "—"}</Text>
          </View>
          <View>
            <Text style={styles.metaLabel}>{props.dateLabel}</Text>
            <Text>{props.dateValue}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDescription}>{columns.description}</Text>
            <Text style={styles.colQty}>{columns.qty}</Text>
            <Text style={styles.colPrice}>{columns.price}</Text>
            <Text style={styles.colTotal}>{columns.total}</Text>
          </View>
          {props.lines.map((line) => (
            <View key={line.id} style={styles.row}>
              <View style={styles.colDescription}>
                <Text>{line.description}</Text>
                {line.note ? <Text style={styles.lineNote}>{line.note}</Text> : null}
              </View>
              <Text style={styles.colQty}>{line.unit ? `${line.qty} ${line.unit}` : line.qty}</Text>
              <Text style={styles.colPrice}>{formatCents(line.unitPriceCents)}</Text>
              <Text style={styles.colTotal}>
                {formatCents(Math.round(line.qty * line.unitPriceCents))}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text>{totalsLabels.subtotal}</Text>
            <Text>{formatCents(totals.subtotalCents)}</Text>
          </View>
          {totals.discountCents > 0 && (
            <View style={styles.totalsRow}>
              <Text>{totalsLabels.discount}</Text>
              <Text>−{formatCents(totals.discountCents)}</Text>
            </View>
          )}
          <View style={styles.totalsRow}>
            <Text>{totalsLabels.tax}</Text>
            <Text>{formatCents(totals.taxCents)}</Text>
          </View>
          <View style={styles.totalsFinal}>
            <Text>{totalsLabels.total}</Text>
            <Text>{formatCents(totals.totalCents)}</Text>
          </View>
          {props.deposit && props.deposit.cents > 0 ? (
            <View style={styles.totalsRow}>
              <Text>{props.deposit.label}</Text>
              <Text>{formatCents(props.deposit.cents)}</Text>
            </View>
          ) : null}
        </View>

        {props.terms?.value ? (
          <View style={styles.notes}>
            <Text style={styles.notesLabel}>{props.terms.label}</Text>
            <Text>{props.terms.value}</Text>
          </View>
        ) : null}

        {props.notes ? (
          <View style={styles.notes}>
            <Text style={styles.notesLabel}>{props.notesLabel}</Text>
            <Text>{props.notes}</Text>
          </View>
        ) : null}

        {props.payment?.value ? (
          <View style={styles.notes}>
            <Text style={styles.notesLabel}>{props.payment.label}</Text>
            <Text>{props.payment.value}</Text>
          </View>
        ) : null}

        {props.signature?.dataUrl ? (
          <View style={styles.signature}>
            <Text style={styles.notesLabel}>{props.signature.label}</Text>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- Image do react-pdf não aceita alt */}
            <Image src={props.signature.dataUrl} style={styles.signatureImg} />
            {props.signature.name ? <Text>{props.signature.name}</Text> : null}
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
