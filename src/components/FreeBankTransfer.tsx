import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Copy, Check, Building2 } from "lucide-react-native";
import { toast } from "../lib/safe";
import { getAllSettings } from "../lib/supabase";

interface BankDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export default function FreeBankTransfer() {
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Load cooperative bank details set by admin (local cache first,
  // then best-effort Supabase sync — never throws on network failure).
  useEffect(() => {
    const fetchBankDetails = async () => {
      try {
        const data = await getAllSettings();
        if (data) {
          setBankDetails({
            bankName: data.coop_bank_name || "",
            accountNumber: data.coop_account_number || "",
            accountName: data.coop_account_name || "",
          });
        }
      } catch (error) {
        console.error("Failed to load bank details", error);
        toast("Could not load cooperative account details");
      }
    };

    fetchBankDetails();
  }, []);

  const copyToClipboard = async (text: string, field: string) => {
    if (!text) return;

    try {
      await Clipboard.setStringAsync(text);
      setCopiedField(field);
      toast(`${field} copied`);

      // Reset icon after 1.8s
      setTimeout(() => setCopiedField(null), 1800);
    } catch (e) {
      toast("Could not copy", "Please copy the details manually.");
    }
  };

  if (!bankDetails?.accountNumber) {
    return (
      <View style={styles.emptyContainer}>
        <Building2 size={40} color="#9ca3af" />
        <Text style={styles.emptyText}>
          Cooperative account details have not been set by the admin yet.
        </Text>
      </View>
    );
  }

  const renderField = (label: string, value: string, fieldKey: string) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={styles.value} numberOfLines={1}>
          {value || "—"}
        </Text>
        <TouchableOpacity
          onPress={() => copyToClipboard(value, fieldKey)}
          style={styles.copyButton}
          activeOpacity={0.7}
        >
          {copiedField === fieldKey ? (
            <Check size={18} color="#4CAF50" />
          ) : (
            <Copy size={18} color="#6b7280" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Option B — Free Bank Transfer</Text>
      <Text style={styles.subtitle}>
        Transfer to the official cooperative account, then submit proof below.
      </Text>

      {renderField("Bank Name", bankDetails.bankName, "Bank Name")}
      {renderField("Account Number", bankDetails.accountNumber, "Account Number")}
      {renderField("Account Name", bankDetails.accountName, "Account Name")}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: -8,
  },
  fieldContainer: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  value: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
    marginRight: 12,
  },
  copyButton: {
    padding: 6,
    borderRadius: 8,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    paddingHorizontal: 20,
  },
});