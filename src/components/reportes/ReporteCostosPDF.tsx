import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

interface FilaMueble {
  codigo: string;
  nombre: string;
  categoria: string;
  costoActual: number;
  items: number;
  updatedAt: string;
}

interface Props {
  muebles: FilaMueble[];
  fechaGeneracion: string;
  categoriaFiltro?: string | null;
}

const AZUL = "#1976D2";
const NAVY = "#1A2035";
const GRIS_CLARO = "#F5F6FA";
const GRIS_BORDE = "#E0E3EA";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 36,
    paddingBottom: 50,
    paddingHorizontal: 36,
    color: NAVY,
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: AZUL,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
  },
  headerSub: {
    fontSize: 9,
    color: "#666",
    marginTop: 3,
  },
  headerRight: {
    fontSize: 8,
    color: "#666",
    textAlign: "right",
  },
  // Resumen
  resumen: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  resumenBox: {
    flex: 1,
    backgroundColor: GRIS_CLARO,
    borderRadius: 4,
    padding: 8,
    borderWidth: 1,
    borderColor: GRIS_BORDE,
  },
  resumenLabel: {
    fontSize: 7,
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  resumenValor: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    marginTop: 2,
  },
  // Tabla
  tableHeader: {
    flexDirection: "row",
    backgroundColor: AZUL,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 3,
    marginBottom: 1,
  },
  tableHeaderCell: {
    color: "white",
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: GRIS_BORDE,
    alignItems: "center",
  },
  tableRowAlt: {
    backgroundColor: GRIS_CLARO,
  },
  // Columnas
  colCodigo: { width: "13%" },
  colNombre: { width: "36%" },
  colCategoria: { width: "16%" },
  colItems: { width: "8%", textAlign: "center" },
  colCosto: { width: "16%", textAlign: "right" },
  colFecha: { width: "11%", textAlign: "right" },
  // Total
  totalRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderTopWidth: 2,
    borderTopColor: AZUL,
    marginTop: 2,
    backgroundColor: GRIS_CLARO,
  },
  totalLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    width: "73%",
    textAlign: "right",
  },
  totalValor: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: AZUL,
    width: "16%",
    textAlign: "right",
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#999",
    borderTopWidth: 1,
    borderTopColor: GRIS_BORDE,
    paddingTop: 6,
  },
});

function formatPrecio(valor: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor);
}

export function ReporteCostosPDF({ muebles, fechaGeneracion, categoriaFiltro }: Props) {
  const costoTotal = muebles.reduce((s, m) => s + m.costoActual, 0);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Lista de Precios de Costo</Text>
            <Text style={styles.headerSub}>
              La Union Muebles
              {categoriaFiltro ? ` — Categoría: ${categoriaFiltro}` : ""}
            </Text>
          </View>
          <Text style={styles.headerRight}>
            Generado el {fechaGeneracion}
          </Text>
        </View>

        {/* Resumen */}
        <View style={styles.resumen}>
          <View style={styles.resumenBox}>
            <Text style={styles.resumenLabel}>Muebles</Text>
            <Text style={styles.resumenValor}>{muebles.length}</Text>
          </View>
          <View style={styles.resumenBox}>
            <Text style={styles.resumenLabel}>Con costo cargado</Text>
            <Text style={styles.resumenValor}>
              {muebles.filter((m) => m.costoActual > 0).length}
            </Text>
          </View>
          <View style={styles.resumenBox}>
            <Text style={styles.resumenLabel}>Costo promedio</Text>
            <Text style={styles.resumenValor}>
              {muebles.length > 0
                ? formatPrecio(costoTotal / muebles.length)
                : "—"}
            </Text>
          </View>
          <View style={[styles.resumenBox, { borderColor: AZUL, borderWidth: 2 }]}>
            <Text style={styles.resumenLabel}>Costo total catálogo</Text>
            <Text style={[styles.resumenValor, { color: AZUL }]}>
              {formatPrecio(costoTotal)}
            </Text>
          </View>
        </View>

        {/* Tabla */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, styles.colCodigo]}>Código</Text>
          <Text style={[styles.tableHeaderCell, styles.colNombre]}>Nombre</Text>
          <Text style={[styles.tableHeaderCell, styles.colCategoria]}>Categoría</Text>
          <Text style={[styles.tableHeaderCell, styles.colItems, { textAlign: "center" }]}>Ítems</Text>
          <Text style={[styles.tableHeaderCell, styles.colCosto, { textAlign: "right" }]}>Costo actual</Text>
          <Text style={[styles.tableHeaderCell, styles.colFecha, { textAlign: "right" }]}>Actualizado</Text>
        </View>

        {muebles.map((m, i) => (
          <View
            key={m.codigo}
            style={[styles.tableRow, i % 2 !== 0 ? styles.tableRowAlt : {}]}
          >
            <Text style={[styles.colCodigo, { fontFamily: "Courier" }]}>{m.codigo}</Text>
            <Text style={styles.colNombre}>{m.nombre}</Text>
            <Text style={[styles.colCategoria, { color: "#555" }]}>{m.categoria}</Text>
            <Text style={[styles.colItems, { textAlign: "center" }]}>{m.items}</Text>
            <Text style={[styles.colCosto, { textAlign: "right", fontFamily: "Helvetica-Bold" }]}>
              {m.costoActual > 0 ? formatPrecio(m.costoActual) : "—"}
            </Text>
            <Text style={[styles.colFecha, { textAlign: "right", color: "#888" }]}>
              {m.updatedAt}
            </Text>
          </View>
        ))}

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalValor}>{formatPrecio(costoTotal)}</Text>
          <View style={{ width: "11%" }} />
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>La Union Muebles — Sistema de Costeo</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
