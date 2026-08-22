const fs = require('fs');
const p = 'src/screens/MeetingChatScreen.tsx';
let src = fs.readFileSync(p, 'utf8');

// 1. Add missing 'avatar' style key (before avatarImage)
const avFrom = 'headerLeft: { flexDirection: \'row\', alignItems: \'center\', flex: 1 },';
const avTo = avFrom + '\n  avatar: {\n    width: 38,\n    height: 38,\n    borderRadius: 19,\n    backgroundColor: \'#1C4A2E\',\n    justifyContent: \'center\',\n    alignItems: \'center\',\n  },';

if (src.includes('  avatar:') || !src.includes(avFrom)) {
  console.log('avatar key: SKIP (already present or anchor missing)');
} else {
  src = src.replace(avFrom, avTo);
  console.log('avatar key added');
}

// 2. Mic button: TouchableOpacity -> View (View supports onTouch* in RN types)
const micOpen = '<TouchableOpacity\n              style={[styles.micBtn, voiceState.recording && styles.micBtnRecording]}\n              onTouchStart={onMicTouchStart}\n              onTouchMove={onMicTouchMove}\n              onTouchEnd={onMicTouchEnd}\n            >';
const micClose = '</TouchableOpacity>\n\n            <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>';

if (src.includes(micOpen)) {
  src = src.replace(
    micOpen,
    '<View\n              style={[styles.micBtn, voiceState.recording && styles.micBtnRecording]}\n              onTouchStart={onMicTouchStart}\n              onTouchMove={onMicTouchMove}\n              onTouchEnd={onMicTouchEnd}\n            >',
  );
  // Close the matching tag: the first </TouchableOpacity> after the mic open
  const idx = src.indexOf('<View\n              style={[styles.micBtn');
  const closeAt = src.indexOf('</TouchableOpacity>', idx);
  if (closeAt !== -1) {
    src =
      src.slice(0, closeAt) +
      '</View>' +
      src.slice(closeAt + '</TouchableOpacity>'.length);
  }
  console.log('mic button converted to View');
} else if (src.includes('onTouchStart={onMicTouchStart}')) {
  console.log('mic button: CHECK — touch props present but pattern differs');
} else {
  console.log('mic button: not found');
}

fs.writeFileSync(p, src, 'utf8');
console.log('saved');