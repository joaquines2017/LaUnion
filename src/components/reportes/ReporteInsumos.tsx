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

  colCodigo:   { width: 56 },
  colDesc:     { flex: 3 },
  colCat:      { flex: 2 },
  colUnidad:   { width: 50, textAlign: "center" },
  colPrecio:   { width: 72, textAlign: "right" },
  colProv:     { flex: 2 },
  colDims:     { width: 80, textAlign: "center" },

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
  if (n == null) return "—";
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(n);
}

export interface InsumoReporte {
  codigo: string;
  descripcion: string;
  categoria: string;
  unidadMedida: string;
  precioRef: number | null;
  proveedorRef: string | null;
  espesormm: number | null;
  altoM: number | null;
  anchoM: number | null;
  cantidadPrecios: number;
}

interface Props {
  insumos: InsumoReporte[];
  fecha: string;
  filtros: string;
  total: number;
  conDimensiones: boolean;
}

export function ReporteInsumos({ insumos, fecha, filtros, total, conDimensiones }: Props) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.header} fixed>
          <View>
            <Text style={styles.headerTitle}>Lista de Insumos</Text>
            <Text style={styles.headerSub}>
              {filtros || "Todos los insumos activos"}
            </Text>
          </View>
          <View>
            <Text style={styles.headerRight}>Generado: {fecha}</Text>
            <Text style={styles.headerRight}>{total} insumo{total !== 1 ? "s" : ""}</Text>
          </View>
        </View>

        {/* Tabla */}
        <View style={styles.table}>
          <View style={styles.thead} fixed>
            <Text style={[styles.th, styles.colCodigo]}>Código</Text>
            <Text style={[styles.th, styles.colDesc]}>Descripción</Text>
            <Text style={[styles.th, styles.colCat]}>Categoría</Text>
            <Text style={[styles.th, styles.colUnidad]}>Unidad</Text>
            <Text style={[styles.th, styles.colPrecio]}>Precio ref.</Text>
            <Text style={[styles.th, styles.colProv]}>Proveedor</Text>
            {conDimensiones && (
              <Text style={[styles.th, styles.colDims]}>Dimensiones</Text>
            )}
          </View>

          {insumos.map((item, i) => {
            const rowStyle = i % 2 === 0 ? styles.trEven : styles.trOdd;
            const dims = item.altoM && item.anchoM
              ? `${item.altoM.toFixed(2)}×${item.anchoM.toFixed(2)} m${item.espesormm ? ` · ${item.espesormm}mm` : ""}`
              : item.espesormm
              ? `${item.espesormm} mm`
              : "—";

            return (
              <View key={i} style={rowStyle} wrap={false}>
                <Text style={[styles.td, styles.colCodigo, { fontFamily: "Courier", fontSize: 7 }]}>
                  {item.codigo}
                </Text>
                <Text style={[styles.td, styles.colDesc, { fontFamily: "Helvetica-Bold" }]}>
                  {item.descripcion}
                </Text>
                <Text style={[styles.td, styles.colCat, { color: "#555" }]}>
                  {item.categoria}
                </Text>
                <Text style={[styles.td, styles.colUnidad, { fontFamily: "Courier" }]}>
                  {item.unidadMedida}
                </Text>
                <Text style={[styles.td, styles.colPrecio, { fontFamily: "Courier" }]}>
                  {fmt(item.precioRef)}
                </Text>
                <Text style={[styles.td, styles.colProv, { color: "#555" }]}>
                  {item.proveedorRef ?? "—"}
                  {item.cantidadPrecios > 1 && (
                    <Text style={{ color: "#999" }}>{` +${item.cantidadPrecios - 1}`}</Text>
                  )}
                </Text>
                {conDimensiones && (
                  <Text style={[styles.td, styles.colDims, { fontFamily: "Courier", fontSize: 7 }]}>
                    {dims}
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>LaUnion — Lista de Insumos</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
