import { useRef, useState, useEffect } from "react";
import {
  View, Text, StyleSheet, FlatList, ImageBackground, Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@mediguard/shared";

const { width: W } = Dimensions.get("window");
const SLIDE_H = 220;

export type BannerSlide = {
  id:       string;
  image:    string;
  color:    string;
  icon:     keyof typeof Ionicons.glyphMap;
  title:    string;
  subtitle: string;
};

export function BannerCarousel({ slides }: { slides: BannerSlide[] }) {
  const listRef = useRef<FlatList<BannerSlide>>(null);
  const [active,   setActive]   = useState(0);
  const [imgError, setImgError] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const timer = setInterval(() => {
      const next = (active + 1) % slides.length;
      listRef.current?.scrollToIndex({ index: next, animated: true });
      setActive(next);
    }, 3000);
    return () => clearInterval(timer);
  }, [active, slides.length]);

  return (
    <View style={s.root}>
      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          setActive(Math.round(e.nativeEvent.contentOffset.x / W));
        }}
        getItemLayout={(_, i) => ({ length: W, offset: W * i, index: i })}
        onScrollToIndexFailed={(info) => {
          listRef.current?.scrollToOffset({ offset: info.index * W, animated: true });
        }}
        renderItem={({ item, index }) => (
          <View style={s.slide}>
            {/* Shadow wrapper — separate from overflow:hidden to avoid Android shadow clip */}
            <View style={s.shadow}>
              <View style={s.card}>
                {!imgError[item.id] ? (
                  <ImageBackground
                    source={{ uri: item.image }}
                    style={StyleSheet.absoluteFillObject}
                    resizeMode="cover"
                    onError={() => setImgError((p) => ({ ...p, [item.id]: true }))}
                  >
                    <SlideContent item={item} />
                  </ImageBackground>
                ) : (
                  <View style={[StyleSheet.absoluteFillObject, { backgroundColor: item.color }]}>
                    <FallbackDecos />
                    <SlideContent item={item} />
                  </View>
                )}
              </View>
            </View>
          </View>
        )}
      />

    </View>
  );
}

function SlideContent({ item }: { item: BannerSlide }) {
  return (
    <View style={s.inner}>
      {/* Simulated top→bottom gradient via two overlapping layers */}
      <View style={s.overlayTop} />
      <View style={s.overlayBottom} />

      {/* Decorative circles (behind content) */}
      <View style={s.deco1} />
      <View style={s.deco2} />
      <View style={s.deco3} />

      <View style={s.iconBox}>
        <Ionicons name={item.icon} size={28} color="#fff" />
      </View>

      {/* Bottom: title + subtitle anchored to bottom */}
      <View style={s.textBox}>
        <Text style={s.title}>{item.title}</Text>
        <Text style={s.sub} numberOfLines={2}>{item.subtitle}</Text>
      </View>
    </View>
  );
}

function FallbackDecos() {
  return (
    <>
      {/* Pill / capsule shapes scattered in background */}
      <View style={[s.pill, { top: 18,  right: 24,  width: 52, backgroundColor: "rgba(255,255,255,0.28)", transform: [{ rotate: "30deg"  }] }]} />
      <View style={[s.pill, { top: 50,  right: 70,  width: 38, backgroundColor: "rgba(255,200,0,0.40)",    transform: [{ rotate: "-15deg" }] }]} />
      <View style={[s.pill, { top: 90,  right: 18,  width: 44, backgroundColor: "rgba(255,100,80,0.35)",  transform: [{ rotate: "50deg"  }] }]} />
      <View style={[s.pill, { top: 28,  right: 110, width: 30, backgroundColor: "rgba(100,220,255,0.35)", transform: [{ rotate: "-40deg" }] }]} />
      <View style={[s.pill, { top: 120, right: 80,  width: 56, backgroundColor: "rgba(180,100,255,0.30)", transform: [{ rotate: "15deg"  }] }]} />
      <View style={[s.pill, { top: 70,  right: 140, width: 34, backgroundColor: "rgba(255,255,255,0.22)", transform: [{ rotate: "60deg"  }] }]} />
      <View style={s.fallDeco1} />
      <View style={s.fallDeco2} />
    </>
  );
}

const s = StyleSheet.create({
  root:        { marginTop: 16 },
  slide:       { width: W, paddingHorizontal: 16, height: SLIDE_H },

  /* Shadow wrapper — no overflow so elevation/shadow shows on Android */
  shadow:      {
    flex: 1, borderRadius: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 10,
  },
  /* Card — overflow hidden for image border-radius clipping */
  card:        { flex: 1, borderRadius: 22, overflow: "hidden" },

  inner:       { flex: 1, justifyContent: "space-between", padding: 20 },

  /* Gradient simulation — lighter so image shows through clearly */
  overlayTop:  {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  overlayBottom: {
    position: "absolute", bottom: 0, left: 0, right: 0, height: "55%",
    backgroundColor: "rgba(0,0,0,0.34)",
  },

  /* Decorative circles */
  deco1: {
    position: "absolute", top: -28, right: -18,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.09)",
  },
  deco2: {
    position: "absolute", top: 20, right: 30,
    width: 75, height: 75, borderRadius: 38,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  deco3: {
    position: "absolute", bottom: -20, right: -10,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.05)",
  },

  /* Glassmorphism icon */
  iconBox: {
    width: 62, height: 62, borderRadius: 31,
    backgroundColor: "rgba(255,255,255,0.20)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.38)",
    alignItems: "center", justifyContent: "center",
  },

  /* Text */
  textBox: { gap: 5 },
  title:   {
    fontSize: 18, fontWeight: "800", color: "#fff", letterSpacing: 0.15,
    textShadowColor: "rgba(0,0,0,0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  sub:     {
    fontSize: 13, color: "rgba(255,255,255,0.92)", lineHeight: 19,
    textShadowColor: "rgba(0,0,0,0.40)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  /* Pill capsule shape for fallback */
  pill: {
    position: "absolute",
    height: 22,
    borderRadius: 11,
  },

  /* Fallback solid-color decos */
  fallDeco1: {
    position: "absolute", top: -40, right: -30,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.11)",
  },
  fallDeco2: {
    position: "absolute", bottom: -30, left: -20,
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
});
