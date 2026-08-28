import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import SafeImage from '../components/SafeImage';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import {
  ChevronLeft,
  MapPin,
  Heart,
  Phone,
  Star,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react-native';

const CATALOG = [
  { id: 1, title: '2 Plots — Ikoto Farmland', price: '₦ 4,800,000', location: 'Oyo State', desc: 'Prime arable farmland with road access, suitable for crop rotation and co-op farming expansion.' },
  { id: 2, title: 'Toyota Camry 2018', price: '₦ 11,200,000', location: 'Lagos', desc: 'Well-maintained sedan with full service history, low mileage, and a 3-month co-op guarantee.' },
  { id: 3, title: 'Office Ergonomic Chair', price: '₦ 145,000', location: 'Abuja', desc: 'Adjustable ergonomic seating with lumbar support — ideal for home offices and cooperative workspaces.' },
  { id: 4, title: 'Dell XPS Workstation', price: '₦ 1,850,000', location: 'Ibadan', desc: 'High-performance workstation for accounting, records management, and member services.' },
  { id: 5, title: 'Industrial Sewing Machine', price: '₦ 2,400,000', location: 'Kano', desc: 'Heavy-duty industrial sewing equipment offered by a member textile cooperative.' },
  { id: 6, title: 'Member Survey Drone', price: '₦ 980,000', location: 'Port Harcourt', desc: 'Survey-grade drone for land mapping and farm monitoring across member plots.' },
  { id: 7, title: 'Farm Produce Contract', price: '₦ 750,000', location: 'Jos', desc: 'Seasonal produce supply contract arranged between member farming groups.' },
  { id: 8, title: 'Co-op Retail Space (Shop)', price: '₦ 12,000,000', location: 'Lagos', desc: 'Commercial retail unit available to members for business expansion.' },
];

export default function MarketplaceDetailScreen({ navigation: rawNav, route }) {
  const navigation = useSafeNavigation(rawNav);
  // Dynamic admin-uploaded items arrive as a full object; catalog items by id.
  const paramItem = route.params && route.params.item;
  const item = paramItem
    ? {
        title: paramItem.title || 'Listing',
        price: paramItem.price || '',
        location: paramItem.location || '',
        desc: paramItem.description || '',
        imageUri: paramItem.imageUri || null,
      }
    : (() => {
        const found =
          CATALOG.find(p => p.id === Number(route.params && route.params.id)) || CATALOG[0];
        return { ...found, imageUri: null };
      })();
  const [fav, setFav] = useState(false);
  const [contacted, setContacted] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor='#F4F7F5' barStyle="dark-content" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#047857" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Listing Details</Text>
        <TouchableOpacity onPress={() => setFav(!fav)} style={styles.favBtn}>
          <Heart size={22} color={fav ? '#C0392B' : '#047857'} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.content, styles.grow]}>
        {/* Media */}
        <View style={styles.media}>
          {item.imageUri ? (
            <SafeImage source={{ uri: item.imageUri }} style={styles.mediaImage} />
          ) : (
            <MapPin size={64} color="#047857" />
          )}
        </View>

        {/* Title & price */}
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.price}>{item.price}</Text>
        <View style={styles.locationRow}>
          <MapPin size={14} color="#9CB8A6" />
          <Text style={styles.location}>{item.location}</Text>
          <View style={styles.verifiedBadge}>
            <CheckCircle2 size={14} color="#10B981" />
            <Text style={styles.verifiedText}>Member Verified</Text>
          </View>
        </View>

        {/* Description */}
        <Text style={styles.sectionHeader}>About this listing</Text>
        <Text style={styles.description}>{item.desc}</Text>

        {/* Trust card */}
        <View style={styles.trustCard}>
          <ShieldCheck color="#10B981" size={20} />
          <View style={styles.trustTextGroup}>
            <Text style={styles.trustTitle}>Co-op Buyer Protection</Text>
            <Text style={styles.trustSub}>Inspection & escrow available for all member transactions.</Text>
          </View>
        </View>

        {/* CTA */}
        <TouchableOpacity onPress={() => setContacted(true)} style={[styles.contactBtn, contacted && styles.contactedBtn]}>
          <Text style={styles.contactText}>{contacted ? 'Seller Contacted — Awaiting Reply' : 'Contact Seller'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  grow: { flexGrow: 1 },
  container: { flex: 1, backgroundColor: '#F4F7F5' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  topBarTitle: { color: '#0F172A', fontSize: 18, fontWeight: 'bold', flex: 1, marginLeft: 12 },
  favBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  media: { height: 200, borderRadius: 20, backgroundColor: '#132620', justifyContent: 'center', alignItems: 'center', marginBottom: 16, overflow: 'hidden' },
  mediaImage: { width: '100%', height: '100%' },
  title: { color: '#0F172A', fontSize: 19, fontWeight: 'bold', marginBottom: 6 },
  price: { color: '#047857', fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' },
  location: { color: '#9CB8A6', fontSize: 12, marginRight: 8 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  verifiedText: { color: '#10B981', fontSize: 11, fontWeight: 'bold' },
  sectionHeader: { color: '#D3F99D', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  description: { color: '#0F172A', fontSize: 14, lineHeight: 21, marginBottom: 16 },
  trustCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#D1FAE5', marginBottom: 16 },
  trustTextGroup: { flex: 1, marginLeft: 10 },
  trustTitle: { color: '#0F172A', fontSize: 13, fontWeight: '600' },
  trustSub: { color: '#9CB8A6', fontSize: 11, marginTop: 2 },
  contactBtn: { backgroundColor: '#10B981', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  contactedBtn: { backgroundColor: '#D1FAE5' },
  contactText: { color: '#0F172A', fontWeight: 'bold', fontSize: 14 },
});