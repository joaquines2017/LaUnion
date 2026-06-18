import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const NAVY  = "#1A2035";
const AZUL  = "#1976D2";
const GRIS  = "#F5F6FA";
const BORDE = "#E0E3EA";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 8,
    paddingTop: 32,
    paddingBottom: 44,
    paddingHorizontal: 28,
    color: NAVY,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: AZUL,
    paddingBottom: 6,
  },
  headerTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", color: NAVY },
  headerSub:   { fontSize: 8, color: "#666", marginTop: 2 },
  headerRight: { fontSize: 7, color: "#666", textAlign: "right" },

  table:  { width: "100%" },
  thead:  { flexDirection: "row", backgroundColor: NAVY, borderRadius: 2 },
  th:     { paddingVertical: 5, paddingHorizontal: 4, color: "#fff", fontFamily: "Helvetica-Bold" },
  trEven: { flexDirection: "row", backgroundColor: "#fff",  borderBottomWidth: 1, borderBottomColor: BORDE },
  trOdd:  { flexDirection: "row", backgroundColor: GRIS,   borderBottomWidth: 1, borderBottomColor: BORDE },
  td:     { paddingVertical: 4, paddingHorizontal: 4 },

  colCodigo:  { width: 64 },
  colNombre:  { flex: 3 },
  colCat:     { flex: 2 },
  colItems:   { width: 52, textAlign: "center" },
  colCosto:   { width: 88, textAlign: "right" },

  footer: {
    position: "absolute",
    bottom: 22,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#aaa",
    borderTopWidth: 1,
    borderTopColor: BORDE,
    paddingTop: 4,
  },
});

function fmt(n: number | null | undefined): string {
  if (n == null || n === 0) return "—";
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(n);
}

export interface MuebleReporte {
  codigo: string;
  nombre: string;
  categoria: string;
  costoActual: number;
  items: number;
}

interface Props {
  muebles: MuebleReporte[];
  fecha: string;
  filtros: string;
  total: number;
  costoTotal: number;
}

export function ReporteMuebles({ muebles, fecha, filtros, total, costoTotal }: Props) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.header} fixed>
          <View>
            <Text style={styles.headerTitle}>Lista de Muebles</Text>
            <Text style={styles.headerSub}>{filtros || "Todos los muebles activos"}</Text>
          </View>
          <View>
            <Text style={styles.headerRight}>Generado: {fecha}</Text>
            <Text style={styles.headerRight}>{total} mueble{total !== 1 ? "s" : ""}{costoTotal > 0 ? ` · Total: ${fmt(costoTotal)}` : ""}</Text>
          </View>
        </View>

        {/* Tabla */}
        <View style={styles.table}>
          <View style={styles.thead} fixed>
            <Text style={[styles.th, styles.colCodigo]}>Código</Text>
            <Text style={[styles.th, styles.colNombre]}>Nombre</Text>
            <Text style={[styles.th, styles.colCat]}>Categoría</Text>
            <Text style={[styles.th, styles.colItems]}>Ítems</Text>
            <Text style={[styles.th, styles.colCosto]}>Costo</Text>
          </View>

          {muebles.map((m, i) => {
            const rowStyle = i % 2 === 0 ? styles.trEven : styles.trOdd;
            return (
              <View key={i} style={rowStyle} wrap={false}>
                <Text style={[styles.td, styles.colCodigo, { fontFamily: "Courier", fontSize: 7 }]}>
                  {m.codigo}
                </Text>
                <Text style={[styles.td, styles.colNombre, { fontFamily: "Helvetica-Bold" }]}>
                  {m.nombre}
                </Text>
                <Text style={[styles.td, styles.colCat, { color: "#555" }]}>
                  {m.categoria}
                </Text>
                <Text style={[styles.td, styles.colItems, { fontFamily: "Courier" }]}>
                  {m.items > 0 ? String(m.items) : "—"}
                </Text>
                <Text style={[styles.td, styles.colCosto, { fontFamily: "Courier" }]}>
                  {fmt(m.costoActual)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>LaUnion — Lista de Muebles</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
