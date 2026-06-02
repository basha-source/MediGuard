import { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@mediguard/shared";

export type CalendarPickerProps = {
  visible:      boolean;
  title:        string;
  selectedDate: string;   // YYYY-MM-DD or ""
  minDate?:     string;   // YYYY-MM-DD — days on/before this are disabled
  onConfirm:    (date: string) => void;
  onCancel:     () => void;
};

const DAY_LABELS  = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function toYMD(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function todayYMD(): string {
  const t = new Date();
  return toYMD(t.getFullYear(), t.getMonth(), t.getDate());
}

export function CalendarPickerModal({
  visible, title, selectedDate, minDate, onConfirm, onCancel,
}: CalendarPickerProps) {
  const [year,   setYear]   = useState(new Date().getFullYear());
  const [month,  setMonth]  = useState(new Date().getMonth());
  const [picked, setPicked] = useState(selectedDate);

  useEffect(() => {
    if (!visible) return;
    const base = selectedDate || todayYMD();
    const d = new Date(base + "T00:00:00");
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setPicked(selectedDate);
  }, [visible, selectedDate]);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else             { setMonth((m) => m - 1); }
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else              { setMonth((m) => m + 1); }
  }

  const firstDow    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today       = todayYMD();

  function isDisabled(day: number): boolean {
    const s = toYMD(year, month, day);
    if (s < today) return true;
    if (minDate && s <= minDate) return true;
    return false;
  }

  // Build flat cell array (null = empty leading cell)
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={c.backdrop}>
        <View style={c.card}>
          {/* Title */}
          <Text style={c.title}>{title}</Text>

          {/* Month navigator */}
          <View style={c.monthNav}>
            <TouchableOpacity style={c.navBtn} onPress={prevMonth} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={c.monthLabel}>{MONTH_NAMES[month]} {year}</Text>
            <TouchableOpacity style={c.navBtn} onPress={nextMonth} activeOpacity={0.7}>
              <Ionicons name="chevron-forward" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Day-of-week header */}
          <View style={c.weekRow}>
            {DAY_LABELS.map((d) => (
              <Text key={d} style={c.dayHeader}>{d}</Text>
            ))}
          </View>

          {/* Calendar grid */}
          {rows.map((row, ri) => (
            <View key={ri} style={c.weekRow}>
              {row.map((day, di) => {
                if (day === null) return <View key={di} style={c.cell} />;
                const disabled = isDisabled(day);
                const selected = toYMD(year, month, day) === picked;
                const isToday  = toYMD(year, month, day) === today;
                return (
                  <TouchableOpacity
                    key={di}
                    style={[
                      c.cell,
                      selected  && c.cellSelected,
                      isToday && !selected && c.cellToday,
                    ]}
                    onPress={() => !disabled && setPicked(toYMD(year, month, day))}
                    activeOpacity={0.7}
                    disabled={disabled}
                  >
                    <Text style={[
                      c.cellText,
                      selected  && c.cellTextSelected,
                      disabled  && c.cellTextDisabled,
                      isToday && !selected && c.cellTextToday,
                    ]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          {/* Actions */}
          <View style={c.actions}>
            <TouchableOpacity style={c.btnGhost} onPress={onCancel} activeOpacity={0.7}>
              <Text style={c.btnGhostTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[c.btnPrimary, !picked && c.btnDisabled]}
              onPress={() => picked && onConfirm(picked)}
              disabled={!picked}
              activeOpacity={0.85}
            >
              <Text style={c.btnPrimaryTxt}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const CELL = 38;

const c = StyleSheet.create({
  backdrop:    { flex: 1, backgroundColor: "rgba(0,0,0,0.48)", alignItems: "center", justifyContent: "center", padding: 16 },
  card:        { width: "100%", maxWidth: 360, backgroundColor: Colors.white, borderRadius: 20, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 12 },
  title:       { fontSize: 16, fontWeight: "700", color: Colors.textPrimary, textAlign: "center", marginBottom: 18 },

  monthNav:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  navBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.bg, alignItems: "center", justifyContent: "center" },
  monthLabel:  { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },

  weekRow:     { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  dayHeader:   { width: CELL, textAlign: "center", fontSize: 11, fontWeight: "600", color: Colors.textSecondary, paddingBottom: 6 },

  cell:            { width: CELL, height: CELL, borderRadius: CELL / 2, alignItems: "center", justifyContent: "center" },
  cellSelected:    { backgroundColor: Colors.primary },
  cellToday:       { borderWidth: 1.5, borderColor: Colors.primary },
  cellText:        { fontSize: 14, fontWeight: "500", color: Colors.textPrimary },
  cellTextSelected:{ color: Colors.white, fontWeight: "700" },
  cellTextDisabled:{ color: "#CACACA" },
  cellTextToday:   { color: Colors.primary, fontWeight: "700" },

  actions:       { flexDirection: "row", justifyContent: "flex-end", marginTop: 18, gap: 8 },
  btnGhost:      { paddingHorizontal: 16, paddingVertical: 10 },
  btnGhostTxt:   { fontSize: 14, fontWeight: "600", color: Colors.textSecondary },
  btnPrimary:    { paddingHorizontal: 22, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.primary },
  btnPrimaryTxt: { fontSize: 14, fontWeight: "700", color: Colors.white },
  btnDisabled:   { opacity: 0.45 },
});
