import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { INVOICE_STATUS_LABELS } from "@/lib/invoice-status";
import type { InvoiceStatus, PaymentMethod } from "@/generated/prisma/enums";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: "#111111", fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  logo: { width: 56, height: 56, marginBottom: 8, objectFit: "cover" },
  businessName: { fontSize: 14, fontWeight: 700, marginBottom: 2 },
  muted: { color: "#666666" },
  invoiceTitle: { fontSize: 18, fontWeight: 700, textAlign: "right" },
  statusBadge: {
    marginTop: 6,
    alignSelf: "flex-end",
    borderWidth: 1,
    borderColor: "#999999",
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
    fontSize: 9,
  },
  infoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  sectionLabel: { fontSize: 8, color: "#666666", textTransform: "uppercase", marginBottom: 4, letterSpacing: 0.5 },
  metaGrid: { flexDirection: "row", gap: 12 },
  metaCol: { alignItems: "flex-end" },
  table: { marginBottom: 20 },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#dddddd",
    paddingBottom: 6,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#eeeeee",
    paddingVertical: 5,
  },
  colDescription: { flex: 3 },
  colQty: { flex: 1, textAlign: "right" },
  colPrice: { flex: 1.2, textAlign: "right" },
  colTax: { flex: 1, textAlign: "right" },
  colTotal: { flex: 1.2, textAlign: "right" },
  headerCell: { fontSize: 9, color: "#666666" },
  summary: { alignSelf: "flex-end", width: 220, marginBottom: 20 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  summaryTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#dddddd",
    paddingTop: 4,
    marginTop: 2,
    fontWeight: 700,
  },
  notes: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#eeeeee", color: "#444444" },
});

export type InvoicePdfData = {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  currency: string;
  notes: string | null;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  amountPaid: string;
  balanceDue: string;
  business: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    logoPath: string | null;
  };
  customer: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
  items: {
    description: string;
    quantity: string;
    unitPrice: string;
    taxRate: string;
    lineTotal: string;
  }[];
  payments: {
    paymentDate: string;
    paymentMethod: PaymentMethod;
    reference: string | null;
    amount: string;
  }[];
};

function money(amount: string, currency: string) {
  return `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function InvoicePdfDocument({ data }: { data: InvoicePdfData }) {
  return (
    <Document title={data.invoiceNumber}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer's Image has no alt prop; this isn't HTML. */}
            {data.business.logoPath && <Image src={data.business.logoPath} style={styles.logo} />}
            <Text style={styles.businessName}>{data.business.name}</Text>
            {data.business.email && <Text style={styles.muted}>{data.business.email}</Text>}
            {data.business.phone && <Text style={styles.muted}>{data.business.phone}</Text>}
            {data.business.address && <Text style={styles.muted}>{data.business.address}</Text>}
          </View>
          <View>
            <Text style={styles.invoiceTitle}>Invoice {data.invoiceNumber}</Text>
            <Text style={styles.statusBadge}>{INVOICE_STATUS_LABELS[data.status]}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View>
            <Text style={styles.sectionLabel}>Billed to</Text>
            <Text style={{ fontWeight: 700, marginBottom: 2 }}>{data.customer.name}</Text>
            {data.customer.email && <Text style={styles.muted}>{data.customer.email}</Text>}
            {data.customer.phone && <Text style={styles.muted}>{data.customer.phone}</Text>}
            {data.customer.address && <Text style={styles.muted}>{data.customer.address}</Text>}
          </View>
          <View style={styles.metaCol}>
            <View style={styles.metaGrid}>
              <Text style={styles.muted}>Issue Date</Text>
              <Text>{data.issueDate}</Text>
            </View>
            <View style={styles.metaGrid}>
              <Text style={styles.muted}>Due Date</Text>
              <Text>{data.dueDate}</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.colDescription, styles.headerCell]}>Description</Text>
            <Text style={[styles.colQty, styles.headerCell]}>Qty</Text>
            <Text style={[styles.colPrice, styles.headerCell]}>Price</Text>
            <Text style={[styles.colTax, styles.headerCell]}>Tax</Text>
            <Text style={[styles.colTotal, styles.headerCell]}>Total</Text>
          </View>
          {data.items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.colDescription}>{item.description}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{money(item.unitPrice, data.currency)}</Text>
              <Text style={styles.colTax}>{Number(item.taxRate).toFixed(2)}%</Text>
              <Text style={styles.colTotal}>{money(item.lineTotal, data.currency)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.muted}>Subtotal</Text>
            <Text>{money(data.subtotal, data.currency)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.muted}>Discount</Text>
            <Text>{money(data.discount, data.currency)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.muted}>Tax</Text>
            <Text>{money(data.tax, data.currency)}</Text>
          </View>
          <View style={styles.summaryTotalRow}>
            <Text>Total</Text>
            <Text>{money(data.total, data.currency)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.muted}>Paid</Text>
            <Text>{money(data.amountPaid, data.currency)}</Text>
          </View>
          <View style={styles.summaryTotalRow}>
            <Text>Balance Due</Text>
            <Text>{money(data.balanceDue, data.currency)}</Text>
          </View>
        </View>

        {data.notes && (
          <View style={styles.notes}>
            <Text style={{ fontWeight: 700, marginBottom: 2, color: "#111111" }}>Notes</Text>
            <Text>{data.notes}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
