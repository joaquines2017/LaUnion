import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const NAVY  = "#1A2035";
const AZUL  = "#1976D2";
const GRIS  = "#F5F6FA";
const BORDE = "#E0E3EA";
const VERDE = "#2E7D32";

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

  resumenBox: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  resumenCard: {
    flex: 1,
    backgroundColor: GRIS,
    borderWidth: 1,
    borderColor: BORDE,
    borderRadius: 4,
    padding: 8,
  },
  resumenLabel:  { fontSize: 7, color: "#666" },
  resumenValue:  { fontSize: 13, fontFamily: "Helvetica-Bold", color: NAVY, marginTop: 2 },
  resumenSub:    { fontSize: 7, color: VERDE, marginTop: 1 },

  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    marginBottom: 6,
    marginTop: 10,
  },

  table:  { width: "100%" },
  thead:  { flexDirection: "row", backgroundColor: NAVY, borderRadius: 2 },
  th:     { paddingVertical: 5, paddingHorizontal: 4, color: "#fff", fontFamily: "Helvetica-Bold" },
  trEven: { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: BORDE },
  trOdd:  { flexDirection: "row", backgroundColor: GRIS,  borderBottomWidth: 1, borderBottomColor: BORDE },
  td:     { paddingVertical: 4, paddingHorizontal: 4 },

  colMaterial: { flex: 3 },
  colEsp:      { width: 38, textAlign: "center" },
  colAlto:     { width: 52, textAlign: "center" },
  colAncho:    { width: 52, textAlign: "center" },
  colCant:     { width: 40, textAlign: "center" },
  colArea:     { width: 58, textAlign: "right" },
  colNota:     { flex: 2 },

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

export interface ResidualItem {
  insumoDescripcion: string;
  espesormm: number | null;
  altoCm: number;
  anchoCm: number;
  cantidad: number;
  areaM2: number;
  nota: string | null;
  asignado: string;
}

export interface GrupoPlaca {
  material: string;
  espesormm: number | null;
  altoM: number;
  anchoM: number;
  retazos: number;
  areaRetazosM2: number;
  placasEquivalentes: number;
}

interface Props {
  items: ResidualItem[];
  grupos: GrupoPlaca[];
  fecha: string;
  totalM2: number;
}

export function ReporteResiduales({ items, grupos, fecha, totalM2 }: Props) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.header} fixed>
          <View>
            <Text style={styles.headerTitle}>Stock de Retazos</Text>
            <Text style={styles.headerSub}>Materiales residuales disponibles</Text>
          </View>
          <View>
            <Text style={styles.headerRight}>Generado: {fecha}</Text>
            <Text style={styles.headerRight}>{items.length} retazo{items.length !== 1 ? "s" : ""} disponibles</Text>
          </View>
        </View>

        {/* Resumen de placas equivalentes */}
        {grupos.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Stock equivalente en placas</Text>
            <View style={styles.resumenBox}>
              {grupos.map((g, i) => (
                <View key={i} style={styles.resumenCard}>
                  <Text style={styles.resumenLabel}>
                    {g.material}{g.espesormm ? ` · ${g.espesormm}mm` : ""}
                  </Text>
                  <Text style={styles.resumenLabel}>
                    {g.altoM.toFixed(2)} × {g.anchoM.toFixed(2)} m
                  </Text>
                  <Text style={styles.resumenValue}>
                    {g.placasEquivalentes.toFixed(2)}
                  </Text>
                  <Text style={styles.resumenSub}>
                    placas equiv. · {g.retazos} retazo{g.retazos !== 1 ? "s" : ""}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Detalle */}
        <Text style={styles.sectionTitle}>
          Detalle de retazos · {totalM2.toFixed(3)} m² totales en stock
        </Text>
        <View style={styles.table}>
          <View style={styles.thead} fixed>
            <Text style={[styles.th, styles.colMaterial]}>Material</Text>
            <Text style={[styles.th, styles.colEsp]}>Esp.</Text>
            <Text style={[styles.th, styles.colAlto]}>Alto (cm)</Text>
            <Text style={[styles.th, styles.colAncho]}>Ancho (cm)</Text>
            <Text style={[styles.th, styles.colCant]}>Cant.</Text>
            <Text style={[styles.th, styles.colArea]}>Área (m²)</Text>
            <Text style={[styles.th, styles.colNota]}>Nota / Asignado</Text>
          </View>

          {items.map((item, i) => {
            const rowStyle = i % 2 === 0 ? styles.trEven : styles.trOdd;
            const notaText = [item.nota, item.asignado ? `Asig.: ${item.asignado}` : ""]
              .filter(Boolean)
              .join(" | ");
            return (
              <View key={i} style={rowStyle} wrap={false}>
                <Text style={[styles.td, styles.colMaterial]}>{item.insumoDescripcion}</Text>
                <Text style={[styles.td, styles.colEsp]}>{item.espesormm ?? ""}</Text>
                <Text style={[styles.td, styles.colAlto, { fontFamily: "Courier" }]}>{item.altoCm}</Text>
                <Text style={[styles.td, styles.colAncho, { fontFamily: "Courier" }]}>{item.anchoCm}</Text>
                <Text style={[styles.td, styles.colCant, { fontFamily: "Helvetica-Bold" }]}>{item.cantidad}</Text>
                <Text style={[styles.td, styles.colArea, { fontFamily: "Courier" }]}>
                  {item.areaM2.toFixed(4)}
                </Text>
                <Text style={[styles.td, styles.colNota, { color: "#666" }]}>{notaText}</Text>
              </View>
            );
          })}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>LaUnion — Stock de Retazos</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
