import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

const AZUL = "#1976D2";
const NAVY = "#1A2035";
const GRIS_CLARO = "#F5F6FA";
const GRIS_BORDE = "#E0E3EA";
const VERDE = "#2E7D32";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 36,
    paddingBottom: 50,
    paddingHorizontal: 36,
    color: NAVY,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: AZUL,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
  },
  headerCodigo: {
    fontFamily: "Courier",
    fontSize: 11,
    color: "#666",
    marginTop: 2,
  },
  headerRight: {
    fontSize: 8,
    color: "#666",
    textAlign: "right",
  },
  // Info del mueble
  infoBox: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  infoCard: {
    flex: 1,
    padding: 8,
    backgroundColor: GRIS_CLARO,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: GRIS_BORDE,
  },
  infoLabel: {
    fontSize: 7,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  infoValor: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  // Sección
  seccionTitulo: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: AZUL,
    marginBottom: 4,
    marginTop: 12,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: AZUL,
  },
  // Tabla
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#E3F2FD",
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableHeaderCell: {
    color: AZUL,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: GRIS_BORDE,
  },
  tableRowAlt: { backgroundColor: GRIS_CLARO },
  // Columnas materiales
  mColNombre: { width: "30%" },
  mColCodigo: { width: "12%", fontFamily: "Courier" },
  mColMedidas: { width: "13%", textAlign: "center" },
  mColUnidad: { width: "8%", textAlign: "center" },
  mColCant: { width: "8%", textAlign: "center" },
  mColPrecio: { width: "14%", textAlign: "right" },
  mColTotal: { width: "15%", textAlign: "right" },
  // Subtotal
  subtotalRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: "#BBDEFB",
    backgroundColor: "#E3F2FD",
  },
  subtotalLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    width: "85%",
    textAlign: "right",
    color: AZUL,
  },
  subtotalValor: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    width: "15%",
    textAlign: "right",
    color: AZUL,
  },
  // Total final
  totalBox: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
  },
  totalCard: {
    padding: 10,
    backgroundColor: NAVY,
    borderRadius: 4,
    alignItems: "flex-end",
    minWidth: 180,
  },
  totalLabel: {
    fontSize: 8,
    color: "white",
    opacity: 0.7,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  totalValor: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "white",
    marginTop: 2,
  },
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

interface MaterialFila {
  productoNombre: string;
  codigo: string | null;
  unidadMedida: string | null;
  medidas: string | null;
  cantidad: number;
  costoUnitario: number;
  costoTotal: number;
}

interface InsumoFila {
  descripcion: string;
  codigo: string | null;
  unidadMedida: string | null;
  cantidad: number;
  costoUnitario: number;
  costoTotal: number;
}

interface Props {
  mueble: {
    codigo: string;
    nombre: string;
    categoria: string;
    costoActual: number;
    updatedAt: string;
  };
  materiales: MaterialFila[];
  insumos: InsumoFila[];
  fechaGeneracion: string;
}

export function ReporteDespiece({ mueble, materiales, insumos, fechaGeneracion }: Props) {
  const costoMateriales = materiales.reduce((s, m) => s + m.costoTotal, 0);
  const costoInsumos = insumos.reduce((s, i) => s + i.costoTotal, 0);
  const costoTotal = costoMateriales + costoInsumos;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>{mueble.nombre}</Text>
            <Text style={styles.headerCodigo}>{mueble.codigo}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text>Despiece detallado</Text>
            <Text style={{ marginTop: 2 }}>La Union Muebles</Text>
            <Text style={{ marginTop: 2 }}>Generado el {fechaGeneracion}</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoBox}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Categoría</Text>
            <Text style={styles.infoValor}>{mueble.categoria}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Materiales</Text>
            <Text style={styles.infoValor}>{materiales.length}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Insumos</Text>
            <Text style={styles.infoValor}>{insumos.length}</Text>
          </View>
          <View style={[styles.infoCard, { borderColor: AZUL, borderWidth: 1.5 }]}>
            <Text style={styles.infoLabel}>Costo total</Text>
            <Text style={[styles.infoValor, { color: AZUL }]}>
              {formatPrecio(costoTotal)}
            </Text>
          </View>
        </View>

        {/* Materiales */}
        {materiales.length > 0 && (
          <>
            <Text style={styles.seccionTitulo}>
              Materiales / Placas ({materiales.length})
            </Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.mColNombre]}>Descripción</Text>
              <Text style={[styles.tableHeaderCell, styles.mColCodigo]}>Código</Text>
              <Text style={[styles.tableHeaderCell, styles.mColMedidas, { textAlign: "center" }]}>Medidas</Text>
              <Text style={[styles.tableHeaderCell, styles.mColUnidad, { textAlign: "center" }]}>Unidad</Text>
              <Text style={[styles.tableHeaderCell, styles.mColCant, { textAlign: "center" }]}>Cant.</Text>
              <Text style={[styles.tableHeaderCell, styles.mColPrecio, { textAlign: "right" }]}>P. unitario</Text>
              <Text style={[styles.tableHeaderCell, styles.mColTotal, { textAlign: "right" }]}>Subtotal</Text>
            </View>
            {materiales.map((m, i) => (
              <View key={i} style={[styles.tableRow, i % 2 !== 0 ? styles.tableRowAlt : {}]}>
                <Text style={styles.mColNombre}>{m.productoNombre}</Text>
                <Text style={[styles.mColCodigo, { fontFamily: "Courier", color: "#666" }]}>
                  {m.codigo ?? "—"}
                </Text>
                <Text style={[styles.mColMedidas, { textAlign: "center", fontFamily: "Courier" }]}>
                  {m.medidas ?? "—"}
                </Text>
                <Text style={[styles.mColUnidad, { textAlign: "center", color: "#666" }]}>
                  {m.unidadMedida ?? "—"}
                </Text>
                <Text style={[styles.mColCant, { textAlign: "center" }]}>{m.cantidad}</Text>
                <Text style={[styles.mColPrecio, { textAlign: "right" }]}>
                  {formatPrecio(m.costoUnitario)}
                </Text>
                <Text style={[styles.mColTotal, { textAlign: "right", fontFamily: "Helvetica-Bold" }]}>
                  {formatPrecio(m.costoTotal)}
                </Text>
              </View>
            ))}
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>Subtotal materiales</Text>
              <Text style={styles.subtotalValor}>{formatPrecio(costoMateriales)}</Text>
            </View>
          </>
        )}

        {/* Insumos */}
        {insumos.length > 0 && (
          <>
            <Text style={styles.seccionTitulo}>
              Insumos y gastos ({insumos.length})
            </Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.mColNombre]}>Descripción</Text>
              <Text style={[styles.tableHeaderCell, styles.mColCodigo]}>Código</Text>
              <Text style={[styles.tableHeaderCell, { width: "21%" }]}></Text>
              <Text style={[styles.tableHeaderCell, styles.mColUnidad, { textAlign: "center" }]}>Unidad</Text>
              <Text style={[styles.tableHeaderCell, styles.mColCant, { textAlign: "center" }]}>Cant.</Text>
              <Text style={[styles.tableHeaderCell, styles.mColPrecio, { textAlign: "right" }]}>P. unitario</Text>
              <Text style={[styles.tableHeaderCell, styles.mColTotal, { textAlign: "right" }]}>Subtotal</Text>
            </View>
            {insumos.map((ins, i) => (
              <View key={i} style={[styles.tableRow, i % 2 !== 0 ? styles.tableRowAlt : {}]}>
                <Text style={styles.mColNombre}>{ins.descripcion}</Text>
                <Text style={[styles.mColCodigo, { fontFamily: "Courier", color: "#666" }]}>
                  {ins.codigo ?? "—"}
                </Text>
                <View style={{ width: "21%" }} />
                <Text style={[styles.mColUnidad, { textAlign: "center", color: "#666" }]}>
                  {ins.unidadMedida ?? "—"}
                </Text>
                <Text style={[styles.mColCant, { textAlign: "center" }]}>{ins.cantidad}</Text>
                <Text style={[styles.mColPrecio, { textAlign: "right" }]}>
                  {formatPrecio(ins.costoUnitario)}
                </Text>
                <Text style={[styles.mColTotal, { textAlign: "right", fontFamily: "Helvetica-Bold" }]}>
                  {formatPrecio(ins.costoTotal)}
                </Text>
              </View>
            ))}
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>Subtotal insumos</Text>
              <Text style={styles.subtotalValor}>{formatPrecio(costoInsumos)}</Text>
            </View>
          </>
        )}

        {/* Total */}
        <View style={styles.totalBox}>
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Costo total del mueble</Text>
            <Text style={styles.totalValor}>{formatPrecio(costoTotal)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>
            {mueble.nombre} ({mueble.codigo}) — La Union Muebles
          </Text>
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
