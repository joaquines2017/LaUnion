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
  trEven: { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: BORDE },
  trOdd:  { flexDirection: "row", backgroundColor: GRIS,  borderBottomWidth: 1, borderBottomColor: BORDE },
  td:     { paddingVertical: 4, paddingHorizontal: 4 },

  // Anchos (A4 landscape ~781pt usable)
  colAncho:  { width: 52 },
  colAlto:   { width: 52 },
  colEsp:    { width: 38 },
  colQty:    { width: 36 },
  colPieza:  { width: 148 },
  colInsumo: { width: 155 },
  colMueble: { width: 300 },   // columna ancha para lista de muebles

  muebleRow: { flexDirection: "row", marginBottom: 1 },
  muebleCod: { fontFamily: "Courier", fontSize: 7, color: "#666", marginRight: 4, width: 62 },
  muebleNom: { fontSize: 7, flex: 1 },
  muebleQty: { fontFamily: "Helvetica-Bold", fontSize: 7, color: AZUL, marginLeft: 4, width: 20, textAlign: "right" },

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

export interface MuebleRef {
  id: string;
  codigo: string;
  nombre: string;
  cantidad: number;
}

export interface FilaCorte {
  anchoCm: number;
  altoCm: number;
  espesormm: number | null;
  cantidad: number;
  pieza: string;
  insumo: string | null;
  muebles: MuebleRef[];
}

interface Props {
  filas: FilaCorte[];
  ordenadoPor: string;
  fecha: string;
}

export function ListaCorte({ filas, ordenadoPor, fecha }: Props) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.header} fixed>
          <View>
            <Text style={styles.headerTitle}>Lista de Corte</Text>
            <Text style={styles.headerSub}>Orden: {ordenadoPor}</Text>
          </View>
          <View>
            <Text style={styles.headerRight}>Generado: {fecha}</Text>
            <Text style={styles.headerRight}>{filas.length} cortes únicos</Text>
          </View>
        </View>

        {/* Tabla */}
        <View style={styles.table}>
          <View style={styles.thead} fixed>
            <Text style={[styles.th, styles.colAncho, { textAlign: "center" }]}>Ancho</Text>
            <Text style={[styles.th, styles.colAlto,  { textAlign: "center" }]}>Alto</Text>
            <Text style={[styles.th, styles.colEsp,   { textAlign: "center" }]}>Esp.</Text>
            <Text style={[styles.th, styles.colQty,   { textAlign: "center" }]}>Cant.</Text>
            <Text style={[styles.th, styles.colPieza]}>Pieza</Text>
            <Text style={[styles.th, styles.colInsumo]}>Insumo</Text>
            <Text style={[styles.th, styles.colMueble]}>Muebles</Text>
          </View>

          {filas.map((f, i) => {
            const rowStyle = i % 2 === 0 ? styles.trEven : styles.trOdd;
            return (
              <View key={i} style={rowStyle} wrap={false}>
                <Text style={[styles.td, styles.colAncho, { textAlign: "center", fontFamily: "Courier" }]}>
                  {f.anchoCm}
                </Text>
                <Text style={[styles.td, styles.colAlto, { textAlign: "center", fontFamily: "Courier" }]}>
                  {f.altoCm}
                </Text>
                <Text style={[styles.td, styles.colEsp, { textAlign: "center" }]}>
                  {f.espesormm != null ? String(f.espesormm) : ""}
                </Text>
                <Text style={[styles.td, styles.colQty, { textAlign: "center", fontFamily: "Helvetica-Bold" }]}>
                  {f.cantidad}
                </Text>
                <Text style={[styles.td, styles.colPieza]}>{f.pieza}</Text>
                <Text style={[styles.td, styles.colInsumo]}>{f.insumo ?? ""}</Text>
                {/* Lista de muebles */}
                <View style={[styles.td, styles.colMueble]}>
                  {f.muebles.map((m, j) => (
                    <View key={j} style={styles.muebleRow}>
                      <Text style={styles.muebleCod}>{m.codigo}</Text>
                      <Text style={styles.muebleNom}>{m.nombre}</Text>
                      <Text style={styles.muebleQty}>×{m.cantidad}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>LaUnion — Lista de Corte</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
