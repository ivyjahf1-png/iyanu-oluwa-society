import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { themes } from '../theme/colors';
import SafeImage from '../components/SafeImage';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import {
  ChevronLeft,
  Search,
  MapPin,
  Heart,
  Car,
  Armchair,
  Cpu,
  ShoppingBag,
  Camera,
  Pin,
} from 'lucide-react-native';
import { useMarketItems } from '../context/MarketItemsContext';

const CATEGORIES = ['All', 'Land', 'Vehicles', 'Electronics', 'Furniture', 'Produce'];

const PRODUCTS = [
  { id: 1, title: '2 Plots — Ikoto Farmland', price: '₦ 4,800,000', location: 'Oyo State', category: 'Land', icon: Pin },
  { id: 2, title: 'Toyota Camry 2018', price: '₦ 11,200,000', location: 'Lagos', category: 'Vehicles', icon: Car },
  { id: 3, title: 'Office Ergonomic Chair', price: '₦ 145,000', location: 'Abuja', category: 'Furniture', icon: Armchair },
  { id: 4, title: 'Dell XPS Workstation', price: '₦ 1,850,000', location: 'Ibadan', category: 'Electronics', icon: Cpu },
  { id: 5, title: 'Industrial Sewing Machine', price: '₦ 2,400,000', location: 'Kano', category: 'Electronics', icon: ShoppingBag },
  { id: 6, title: 'Member Survey Drone', price: '₦ 980,000', location: 'Port Harcourt', category: 'Electronics', icon: Camera },
  { id: 7, title: 'Farm Produce Contract', price: '₦ 750,000', location: 'Jos', category: 'Produce', icon: ShoppingBag },
  { id: 8, title: 'Co-op Retail Space (Shop)', price: '₦ 12,000,000', location: 'Lagos', category: 'Land', icon: Pin },
];

// Route-param categories → in-app filter categories.
const CATEGORY_PARAM_MAP = {
  land_and_property: 'Land',
  vehicles_and_appliances: 'Vehicles',
};

export default function MarketplaceScreen({ navigation: rawNav, route }) {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const navigation = useSafeNavigation(rawNav);
  const { items: adminItems } = useMarketItems();
  const [category, setCategory] = useState(
    CATEGORY_PARAM_MAP[route?.params?.category] || 'All',
  );
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState([]);

  const toggleFavorite = id => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  // Admin-uploaded items render first, followed by the built-in catalog.
  const allListings = [
    ...adminItems.map(i => ({ ...i, category: i.category || 'General', isDynamic: true })),
    ...PRODUCTS,
  ];

  const filtered = allListings.filter(p =>
    (category === 'All' || p.category === category) &&
    (query.trim() === '' || p.title.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor='#F4F7F5' barStyle="dark-content" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.primaryDark} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Member Marketplace</Text>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Search size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search land, cars, items..."
          placeholderTextColor="#526E63"
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.catalog}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Category chips */}
        <View style={styles.categoryRow}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              onPress={() => setCategory(cat)}
              style={[styles.chip, category === cat && styles.chipActive]}
            >
              <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.resultCount}>{filtered.length} listings available</Text>

        {/* Product grid */}
        <View style={styles.grid}>
          {filtered.map(item => {
            const Icon = item.icon;
            const fav = favorites.includes(item.id);
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                onPress={() =>
                  navigation.navigate(
                    'MarketplaceDetail',
                    item.isDynamic ? { item } : { id: item.id },
                  )
                }
              >
                <View style={styles.cardMedia}>
                  {item.imageUri ? (
                    <SafeImage source={{ uri: item.imageUri }} style={styles.cardMediaImage} />
                  ) : Icon ? (
                    <Icon size={34} color={colors.primaryDark} />
                  ) : (
                    <ShoppingBag size={34} color={colors.primaryDark} />
                  )}
                  <TouchableOpacity onPress={() => toggleFavorite(item.id)} style={styles.favBtn}>
                    <Heart size={18} color={fav ? '#C0392B' : '#9CB8A6'} fill={fav ? '#C0392B' : 'transparent'} />
                  </TouchableOpacity>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.cardPrice}>{item.price}</Text>
                  <View style={styles.cardLocRow}>
                    <MapPin size={12} color={colors.textSecondary} />
                    <Text style={styles.cardLoc} numberOfLines={1}>{item.location}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {filtered.length === 0 && (
          <View style={styles.empty}>
            <ShoppingBag size={40} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No listings match your search.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors, isDark) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#06130D' 
  },
  topBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 12 
  },
  backBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#FFFFFF', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  topBarTitle: { 
    color: '#0F172A', 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginLeft: 12 
  },
  searchBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF', 
    borderRadius: 12, 
    marginHorizontal: 16, 
    paddingHorizontal: 12, 
    marginBottom: 12 
  },
  searchInput: { 
    flex: 1, 
    color: '#0F172A', 
    fontSize: 14, 
    paddingVertical: 10, 
    marginLeft: 8 
  },
  scrollView: { 
    flex: 1 
  },
  catalog: { 
    paddingHorizontal: 16, 
    paddingBottom: Platform.OS === 'web' ? 110 : 40,
    flexGrow: 1,
  },
  categoryRow: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    marginBottom: 8 
  },
  chip: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 16, 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    marginRight: 8, 
    marginBottom: 6 
  },
  chipActive: { 
    backgroundColor: '#10B981' 
  },
  chipText: { 
    color: '#9CB8A6', 
    fontSize: 12 
  },
  chipTextActive: { 
    color: '#0F172A', 
    fontWeight: 'bold' 
  },
  resultCount: { 
    color: '#9CB8A6', 
    fontSize: 11, 
    marginBottom: 10 
  },
  grid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between' 
  },
  card: { 
    width: '48%', 
    backgroundColor: '#FFFFFF', 
    borderRadius: 14, 
    borderWidth: 1, 
    borderColor: '#D1FAE5', 
    marginBottom: 10, 
    overflow: 'hidden' 
  },
  cardMedia: { 
    height: 110, 
    backgroundColor: '#132620', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  cardMediaImage: { 
    width: '100%', 
    height: '100%' 
  },
  favBtn: { 
    position: 'absolute', 
    top: 8, 
    right: 8, 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    backgroundColor: 'rgba(20,10,9,0.6)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  cardBody: { 
    padding: 10 
  },
  cardTitle: { 
    color: '#0F172A', 
    fontSize: 13, 
    fontWeight: '600' 
  },
  cardPrice: { 
    color: '#047857', 
    fontSize: 13, 
    fontWeight: 'bold', 
    marginTop: 4 
  },
  cardLocRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 4 
  },
  cardLoc: { 
    color: '#9CB8A6', 
    fontSize: 11, 
    marginLeft: 4 
  },
  empty: { 
    alignItems: 'center', 
    paddingVertical: 40 
  },
  emptyText: { 
    color: '#9CB8A6', 
    fontSize: 13, 
    marginTop: 10 
  },
});

const styles = makeStyles(themes.darkEmerald, true);
