import { Phrase, Situation } from '../types';

export const SITUATIONS: Situation[] = [
  { id: 'restaurant', label: 'Restaurant & ordering', icon: 'BowlFood', sub: 'menus, allergies, the bill' },
  { id: 'train', label: 'Train & directions', icon: 'Train', sub: 'platforms, transfers, lost' },
  { id: 'shopping', label: 'Shopping & tax-free', icon: 'ShoppingBag', sub: 'sizes, passport, wrapping' },
  { id: 'ryokan', label: 'Ryokan & onsen', icon: 'Bathtub', sub: 'etiquette, tattoos, futon' },
  { id: 'emergencies', label: 'Emergencies & pharmacy', icon: 'FirstAidKit', sub: 'symptoms, hospital, help' },
  { id: 'politeness', label: 'Politeness basics', icon: 'HandWaving', sub: 'greetings, thanks, sorry' },
  { id: 'numbers', label: 'Numbers & money', icon: 'Coins', sub: 'counting, prices, cards' },
  { id: 'allergies', label: 'Allergies & diet', icon: 'Leaf', sub: 'no dairy, no pork, vegetarian' },
];

export const PHRASES: Phrase[] = [
  // Restaurant & ordering
  { id: 'r1', situationId: 'restaurant', en: 'Do you have an English menu?', romaji: 'Eigo no menyuu wa arimasu ka?', kana: '英語のメニューはありますか？' },
  { id: 'r2', situationId: 'restaurant', en: 'Table for two, please.', romaji: 'Futari desu.', kana: '二人です。' },
  { id: 'r3', situationId: 'restaurant', en: 'What do you recommend?', romaji: 'Osusume wa nan desu ka?', kana: 'おすすめは何ですか？' },
  { id: 'r4', situationId: 'restaurant', en: 'Does this contain dairy?', romaji: 'Kore ni nyuuseihin wa haitte imasu ka?', kana: 'これに乳製品は入っていますか？' },
  { id: 'r5', situationId: 'restaurant', en: 'Can I pay by card?', romaji: 'Kaado de haraemasu ka?', kana: 'カードで払えますか？' },
  { id: 'r6', situationId: 'restaurant', en: 'That was delicious, thank you.', romaji: 'Gochisousama deshita.', kana: 'ごちそうさまでした。' },
  { id: 'r7', situationId: 'restaurant', en: 'The bill, please.', romaji: 'Okaikei onegaishimasu.', kana: 'お会計お願いします。' },
  { id: 'r8', situationId: 'restaurant', en: "I'd like this one.", romaji: 'Kore o kudasai.', kana: 'これをください。' },
  { id: 'r9', situationId: 'restaurant', en: 'Not too spicy, please.', romaji: 'Amari karaku nai you ni shite kudasai.', kana: 'あまり辛くないようにしてください。' },
  { id: 'r10', situationId: 'restaurant', en: 'Is this seat available?', romaji: 'Kono seki wa aite imasu ka?', kana: 'この席は空いていますか？' },
  { id: 'r11', situationId: 'restaurant', en: 'Water, please.', romaji: 'Omizu o kudasai.', kana: 'お水をください。' },
  { id: 'r12', situationId: 'restaurant', en: "I'm full, thank you.", romaji: 'Onaka ga ippai desu.', kana: 'お腹がいっぱいです。' },
  // Train & directions
  { id: 't1', situationId: 'train', en: 'Which platform for Kyoto?', romaji: 'Kyoto-yuki no hoomu wa doko desu ka?', kana: '京都行きのホームはどこですか？' },
  { id: 't2', situationId: 'train', en: 'Does this train stop at Shinjuku?', romaji: 'Kono densha wa Shinjuku ni tomarimasu ka?', kana: 'この電車は新宿に止まりますか？' },
  { id: 't3', situationId: 'train', en: 'Where is the nearest station?', romaji: 'Ichiban chikai eki wa doko desu ka?', kana: '一番近い駅はどこですか？' },
  { id: 't4', situationId: 'train', en: "I'm lost.", romaji: 'Michi ni mayoimashita.', kana: '道に迷いました。' },
  { id: 't5', situationId: 'train', en: 'Where do I transfer?', romaji: 'Doko de norikaemasu ka?', kana: 'どこで乗り換えますか？' },
  { id: 't6', situationId: 'train', en: 'Is this seat reserved?', romaji: 'Kono seki wa yoyaku sarete imasu ka?', kana: 'この席は予約されていますか？' },
  { id: 't7', situationId: 'train', en: 'What time does the last train leave?', romaji: 'Shuuden wa nanji desu ka?', kana: '終電は何時ですか？' },
  { id: 't8', situationId: 'train', en: 'How much is the fare?', romaji: 'Ryoukin wa ikura desu ka?', kana: '料金はいくらですか？' },
  { id: 't9', situationId: 'train', en: 'Which exit should I use?', romaji: 'Dono deguchi o tsukaeba ii desu ka?', kana: 'どの出口を使えばいいですか？' },
  { id: 't10', situationId: 'train', en: 'Is there an elevator?', romaji: 'Erebeetaa wa arimasu ka?', kana: 'エレベーターはありますか？' },
  // Shopping & tax-free
  { id: 's1', situationId: 'shopping', en: 'Can I try this on?', romaji: 'Kore o shichaku dekimasu ka?', kana: 'これを試着できますか？' },
  { id: 's2', situationId: 'shopping', en: 'Do you have a smaller size?', romaji: 'Motto chiisai saizu wa arimasu ka?', kana: 'もっと小さいサイズはありますか？' },
  { id: 's3', situationId: 'shopping', en: 'Is this tax-free?', romaji: 'Kore wa menzei desu ka?', kana: 'これは免税ですか？' },
  { id: 's4', situationId: 'shopping', en: 'Here is my passport, for tax-free.', romaji: 'Pasupooto desu.', kana: 'パスポートです。' },
  { id: 's5', situationId: 'shopping', en: 'Can you gift wrap this?', romaji: 'Purezento-you ni tsutsunde moraemasu ka?', kana: 'プレゼント用に包んでもらえますか？' },
  { id: 's6', situationId: 'shopping', en: 'How much is this?', romaji: 'Kore wa ikura desu ka?', kana: 'これはいくらですか？' },
  { id: 's7', situationId: 'shopping', en: "I'm just looking, thank you.", romaji: 'Miteiru dake desu.', kana: '見ているだけです。' },
  { id: 's8', situationId: 'shopping', en: 'Do you accept credit cards?', romaji: 'Kurejitto kaado wa tsukaemasu ka?', kana: 'クレジットカードは使えますか？' },
  { id: 's9', situationId: 'shopping', en: 'Do you ship overseas?', romaji: 'Kaigai hassou wa dekimasu ka?', kana: '海外発送はできますか？' },
  // Ryokan & onsen
  { id: 'y1', situationId: 'ryokan', en: 'What time is check-in?', romaji: 'Chekku in wa nanji desu ka?', kana: 'チェックインは何時ですか？' },
  { id: 'y2', situationId: 'ryokan', en: 'Is the onsen mixed-gender?', romaji: 'Onsen wa konyoku desu ka?', kana: '温泉は混浴ですか？' },
  { id: 'y3', situationId: 'ryokan', en: 'Are tattoos allowed?', romaji: 'Irezumi wa daijoubu desu ka?', kana: '入れ墨は大丈夫ですか？' },
  { id: 'y4', situationId: 'ryokan', en: 'Where do I leave my shoes?', romaji: 'Kutsu wa doko de nugimasu ka?', kana: '靴はどこで脱ぎますか？' },
  { id: 'y5', situationId: 'ryokan', en: 'Do you have a private bath?', romaji: 'Kashikiri-buro wa arimasu ka?', kana: '貸切風呂はありますか？' },
  { id: 'y6', situationId: 'ryokan', en: 'What time is dinner served?', romaji: 'Yuushoku wa nanji desu ka?', kana: '夕食は何時ですか？' },
  { id: 'y7', situationId: 'ryokan', en: 'Where is the futon?', romaji: 'Futon wa doko desu ka?', kana: '布団はどこですか？' },
  { id: 'y8', situationId: 'ryokan', en: 'Should I wash before entering the bath?', romaji: 'Hairu mae ni karada o araimasu ka?', kana: '入る前に体を洗いますか？' },
  { id: 'y9', situationId: 'ryokan', en: 'Can I wear this outside my room?', romaji: 'Kore o heya no soto de kite mo ii desu ka?', kana: 'これを部屋の外で着てもいいですか？' },
  // Emergencies & pharmacy
  { id: 'e1', situationId: 'emergencies', en: 'Help!', romaji: 'Tasukete!', kana: '助けて！' },
  { id: 'e2', situationId: 'emergencies', en: 'Call an ambulance, please.', romaji: 'Kyuukyuusha o yonde kudasai.', kana: '救急車を呼んでください。' },
  { id: 'e3', situationId: 'emergencies', en: 'Where is the nearest hospital?', romaji: 'Ichiban chikai byouin wa doko desu ka?', kana: '一番近い病院はどこですか？' },
  { id: 'e4', situationId: 'emergencies', en: 'I need a doctor.', romaji: 'Isha ga hitsuyou desu.', kana: '医者が必要です。' },
  { id: 'e5', situationId: 'emergencies', en: "I don't feel well.", romaji: 'Guai ga warui desu.', kana: '具合が悪いです。' },
  { id: 'e6', situationId: 'emergencies', en: 'Where is a pharmacy?', romaji: 'Yakkyoku wa doko desu ka?', kana: '薬局はどこですか？' },
  { id: 'e7', situationId: 'emergencies', en: 'I lost my passport.', romaji: 'Pasupooto o nakushimashita.', kana: 'パスポートをなくしました。' },
  { id: 'e8', situationId: 'emergencies', en: 'Where is the police station?', romaji: 'Kouban wa doko desu ka?', kana: '交番はどこですか？' },
  { id: 'e9', situationId: 'emergencies', en: "I'm allergic to this.", romaji: 'Kore ni arerugii ga arimasu.', kana: 'これにアレルギーがあります。' },
  { id: 'e10', situationId: 'emergencies', en: 'Can you call a doctor for me?', romaji: 'Isha o yonde moraemasu ka?', kana: '医者を呼んでもらえますか？' },
  // Politeness basics
  { id: 'p1', situationId: 'politeness', en: 'Hello.', romaji: 'Konnichiwa.', kana: 'こんにちは。' },
  { id: 'p2', situationId: 'politeness', en: 'Thank you.', romaji: 'Arigatou gozaimasu.', kana: 'ありがとうございます。' },
  { id: 'p3', situationId: 'politeness', en: 'Excuse me.', romaji: 'Sumimasen.', kana: 'すみません。' },
  { id: 'p4', situationId: 'politeness', en: "I'm sorry.", romaji: 'Gomen nasai.', kana: 'ごめんなさい。' },
  { id: 'p5', situationId: 'politeness', en: 'Please.', romaji: 'Onegaishimasu.', kana: 'お願いします。' },
  { id: 'p6', situationId: 'politeness', en: 'Nice to meet you.', romaji: 'Hajimemashite.', kana: 'はじめまして。' },
  { id: 'p7', situationId: 'politeness', en: 'Goodbye.', romaji: 'Sayounara.', kana: 'さようなら。' },
  { id: 'p8', situationId: 'politeness', en: 'Yes. / No.', romaji: 'Hai. / Iie.', kana: 'はい。／いいえ。' },
  // Numbers & money
  { id: 'n1', situationId: 'numbers', en: 'One, two, three.', romaji: 'Ichi, ni, san.', kana: '一、二、三。' },
  { id: 'n2', situationId: 'numbers', en: 'How much in total?', romaji: 'Zenbu de ikura desu ka?', kana: '全部でいくらですか？' },
  { id: 'n3', situationId: 'numbers', en: 'Do you have change?', romaji: 'Otsuri wa arimasu ka?', kana: 'おつりはありますか？' },
  { id: 'n4', situationId: 'numbers', en: 'Where is an ATM?', romaji: 'ATM wa doko desu ka?', kana: 'ATMはどこですか？' },
  { id: 'n5', situationId: 'numbers', en: 'Can I get a receipt?', romaji: 'Reshiito o moraemasu ka?', kana: 'レシートをもらえますか？' },
  { id: 'n6', situationId: 'numbers', en: "It's too expensive.", romaji: 'Takasugimasu.', kana: '高すぎます。' },
  { id: 'n7', situationId: 'numbers', en: 'Can you make it cheaper?', romaji: 'Yasuku dekimasu ka?', kana: '安くできますか？' },
  // Allergies & diet
  { id: 'a1', situationId: 'allergies', en: "I'm vegetarian.", romaji: 'Bejitarian desu.', kana: 'ベジタリアンです。' },
  { id: 'a2', situationId: 'allergies', en: 'No pork, please.', romaji: 'Butaniku nashi de onegaishimasu.', kana: '豚肉なしでお願いします。' },
  { id: 'a3', situationId: 'allergies', en: 'Does this have peanuts?', romaji: 'Kore ni piinatsu wa haitte imasu ka?', kana: 'これにピーナッツは入っていますか？' },
  { id: 'a4', situationId: 'allergies', en: "I can't eat raw fish.", romaji: 'Namazakana wa taberaremasen.', kana: '生魚は食べられません。' },
  { id: 'a5', situationId: 'allergies', en: 'Is this gluten-free?', romaji: 'Kore wa gurutenfurii desu ka?', kana: 'これはグルテンフリーですか？' },
  { id: 'a6', situationId: 'allergies', en: 'I have a shellfish allergy.', romaji: 'Koukakurui arerugii ga arimasu.', kana: '甲殻類アレルギーがあります。' },
  { id: 'a7', situationId: 'allergies', en: 'Is this halal?', romaji: 'Kore wa hararu desu ka?', kana: 'これはハラルですか？' },
];

export function phrasesFor(situationId: string): Phrase[] {
  return PHRASES.filter((p) => p.situationId === situationId);
}
