import type { IpaSymbol } from '../types/learning';

/**
 * 미국식 영어 국제음성기호(IPA) 40개 메타데이터 카탈로그 (순수 언어 기호 정의).
 * 대표 영단어는 일절 하드코딩하지 않으며, 각 기호의 ARPAbet 음소(arpaTargets)와
 * 철자 와일드카드(spellingPatterns)를 이용해 Datamuse + Wiktionary에서 실시간 동적 생성합니다.
 */
export const IPA_SYMBOL_CATALOG: IpaSymbol[] = [
  // =========================================================================
  // 1. 기본 모음 (basic_vowels: 11개, 핵심 7개)
  // =========================================================================
  {
    id: 'sym_ae',
    categoryId: 'basic_vowels',
    isCore: true,
    ipa: '/æ/',
    titleKo: "입을 크게 벌리는 '애'",
    mouthGuideKo:
      "입꼬리를 양옆으로 당기면서 아래턱을 크게 내리고 '아' 하듯 '애' 소리를 내세요.",
    koHint: '애 (입 크게)',
    arpaTargets: ['AE1', 'AE2'],
    spellingPatterns: ['?a?', '?a??', '?a????', '??a?????'],
  },
  {
    id: 'sym_ih',
    categoryId: 'basic_vowels',
    isCore: true,
    ipa: '/ɪ/',
    titleKo: "힘 빼고 짧게 '이'",
    mouthGuideKo:
      "입술에 힘을 빼고 '이'와 '에' 사이 느낌으로 아주 짧게 툭 끊어 발음하세요.",
    koHint: '이 (짧게)',
    arpaTargets: ['IH1', 'IH2'],
    spellingPatterns: ['?i?', '?i??', '?i????', '??i?????'],
  },
  {
    id: 'sym_iy',
    categoryId: 'basic_vowels',
    isCore: true,
    ipa: '/iː/',
    titleKo: "웃으며 길게 '이이'",
    mouthGuideKo:
      "환하게 웃듯 입꼬리를 양옆으로 쭉 당기고 '이—' 하고 길고 또렷하게 내세요.",
    koHint: '이— (길게)',
    arpaTargets: ['IY1', 'IY2'],
    spellingPatterns: ['*ee*', '*ea*', '?e????', '*ea?????'],
  },
  {
    id: 'sym_uh',
    categoryId: 'basic_vowels',
    isCore: true,
    ipa: '/ʌ/',
    titleKo: "목 안쪽에서 짧게 '어'",
    mouthGuideKo:
      "입을 가볍게 벌리고 턱에 힘 없이 목 안쪽에서 짧고 선명하게 '어' 소리를 내세요.",
    koHint: '어 (짧게)',
    arpaTargets: ['AH1', 'AH2'],
    spellingPatterns: ['?u?', '?u??', '?u????', '??u?????'],
  },
  {
    id: 'sym_schwa',
    categoryId: 'basic_vowels',
    isCore: true,
    ipa: '/ə/',
    titleKo: "힘 빼고 스치듯 '어'",
    mouthGuideKo:
      "영어에서 가장 자주 나오는 약한 소리입니다. 입에 힘을 완전히 풀고 아주 약하게 '어' 하고 스쳐 지나가세요.",
    koHint: '어 (힘 빼고 약하게)',
    arpaTargets: ['AH0'],
    spellingPatterns: ['a????', 'a?????', '*a?????', '*o??????'],
  },
  {
    id: 'sym_aa',
    categoryId: 'basic_vowels',
    isCore: true,
    ipa: '/ɑː/',
    titleKo: "입을 둥글고 크게 '아—'",
    mouthGuideKo:
      "병원에서 '아—' 하듯 입을 위아래로 시원하게 벌리고 목 깊숙이에서 '아—' 소리를 내세요.",
    koHint: '아— (길고 크게)',
    arpaTargets: ['AA1', 'AA2'],
    spellingPatterns: ['?o?', '?o??', '*o????', '*o??????'],
  },
  {
    id: 'sym_uw',
    categoryId: 'basic_vowels',
    isCore: true,
    ipa: '/uː/',
    titleKo: "입술을 모아 길게 '우—'",
    mouthGuideKo:
      "휘파람 불듯 입술을 동그랗게 앞으로 쭉 내밀고 '우—' 하고 길게 소리 내세요.",
    koHint: '우— (입술 모아 길게)',
    arpaTargets: ['UW1', 'UW2'],
    spellingPatterns: ['*oo*', '?u??', '*u????', '*u??????'],
  },
  {
    id: 'sym_eh',
    categoryId: 'basic_vowels',
    isCore: false,
    ipa: '/ɛ/',
    titleKo: "입을 가볍게 벌려 '에'",
    mouthGuideKo:
      "/æ/보다 입을 덜 벌리고 힘을 뺀 상태로 짧고 담백하게 '에' 소리를 내세요.",
    koHint: '에 (가볍고 짧게)',
    arpaTargets: ['EH1', 'EH2'],
    spellingPatterns: ['?e?', '?e??', '?e????', '??e?????'],
  },
  {
    id: 'sym_uh_short',
    categoryId: 'basic_vowels',
    isCore: false,
    ipa: '/ʊ/',
    titleKo: "입술 힘 빼고 짧게 '우'",
    mouthGuideKo:
      "입술을 길게 내밀지 말고 힘을 푼 채 '우'와 '어' 사이 느낌으로 아주 짧게 발음하세요.",
    koHint: '우 (힘 빼고 짧게)',
    arpaTargets: ['UH1', 'UH2'],
    spellingPatterns: ['*ook*', '*ood*', '*ul*', '*ush*'],
  },
  {
    id: 'sym_ao',
    categoryId: 'basic_vowels',
    isCore: false,
    ipa: '/ɔː/',
    titleKo: "입술 둥글게 길게 '오—'",
    mouthGuideKo:
      "입을 동그랗고 약간 크게 벌려 '어'와 '오' 사이 느낌으로 깊고 길게 '오—' 소리 내세요.",
    koHint: '오— (둥글고 길게)',
    arpaTargets: ['AO1', 'AO2'],
    spellingPatterns: ['*al?', '*au*', '*aw*', '*or????'],
  },
  {
    id: 'sym_er',
    categoryId: 'basic_vowels',
    isCore: false,
    ipa: '/ɜːr/',
    titleKo: "혀를 살짝 말며 '어르'",
    mouthGuideKo:
      "입술을 살짝 오므리고 혀끝을 입천장에 닿지 않게 뒤로 살짝 말면서 길게 '어르—' 소리 내세요.",
    koHint: '어르— (혀 말고 길게)',
    arpaTargets: ['ER1', 'ER2'],
    spellingPatterns: ['*ir?', '*ur?', '*er????', '*ur?????'],
  },

  // =========================================================================
  // 2. 합쳐진 모음 (diphthongs: 5개, 핵심 5개)
  // =========================================================================
  {
    id: 'sym_ey',
    categoryId: 'diphthongs',
    isCore: true,
    ipa: '/eɪ/',
    titleKo: "'에'에서 '이'로 이어지게",
    mouthGuideKo:
      "'에'로 시작해서 입꼬리를 살짝 당기며 자연스럽게 '이'로 미끄러지듯 이어 발음하세요.",
    koHint: '에이',
    arpaTargets: ['EY1', 'EY2'],
    spellingPatterns: ['?a?e', '*ai*', '*ay*', '*a????e'],
  },
  {
    id: 'sym_ay',
    categoryId: 'diphthongs',
    isCore: true,
    ipa: '/aɪ/',
    titleKo: "'아'에서 '이'로 이어지게",
    mouthGuideKo:
      "입을 크게 벌려 '아' 소리를 낸 뒤, 곧바로 '이'로 부드럽게 이어 주세요.",
    koHint: '아이',
    arpaTargets: ['AY1', 'AY2'],
    spellingPatterns: ['?i?e', '*igh*', '*i??e', '*i?????e'],
  },
  {
    id: 'sym_ow',
    categoryId: 'diphthongs',
    isCore: true,
    ipa: '/oʊ/',
    titleKo: "'오'에서 입술 오므려 '우'",
    mouthGuideKo:
      "'오'로 시작하면서 마지막에 입술을 동그랗게 오므려 '우' 느낌으로 마무리하세요.",
    koHint: '오우',
    arpaTargets: ['OW1', 'OW2'],
    spellingPatterns: ['?o?e', '*oa*', '*ow*', '*o?????e'],
  },
  {
    id: 'sym_aw',
    categoryId: 'diphthongs',
    isCore: true,
    ipa: '/aʊ/',
    titleKo: "'아'에서 입술 모아 '우'",
    mouthGuideKo:
      "입을 크게 벌려 '아'를 낸 다음, 빠르게 입술을 둥글게 모으며 '우'로 이어 주세요.",
    koHint: '아우',
    arpaTargets: ['AW1', 'AW2'],
    spellingPatterns: ['*ou?', '*ow?', '*ou???', '*ou?????'],
  },
  {
    id: 'sym_oy',
    categoryId: 'diphthongs',
    isCore: true,
    ipa: '/ɔɪ/',
    titleKo: "'오'에서 '이'로 이어지게",
    mouthGuideKo:
      "입술을 살짝 둥글게 해 '오' 소리를 내고 곧바로 입꼬리를 당겨 '이'로 이어 주세요.",
    koHint: '오이',
    arpaTargets: ['OY1', 'OY2'],
    spellingPatterns: ['*oy', '*oi?', '*oi???', '*oy????'],
  },

  // =========================================================================
  // 3. 입술·혀 모양 자음 (key_consonants: 14개, 핵심 6개)
  // =========================================================================
  {
    id: 'sym_th_voiceless',
    categoryId: 'key_consonants',
    isCore: true,
    ipa: '/θ/',
    titleKo: "혀끝을 살짝 물고 바람 '쓰'",
    mouthGuideKo:
      "혀끝을 윗니와 아랫니 사이에 살짝 내밀고, 목을 울리지 않은 채 바람만 '쓰—' 내보내세요.",
    koHint: '쓰 (혀끝 살짝 물고)',
    arpaTargets: ['TH'],
    spellingPatterns: ['th??', 'th???', 'th?????', '*th????'],
  },
  {
    id: 'sym_th_voiced',
    categoryId: 'key_consonants',
    isCore: true,
    ipa: '/ð/',
    titleKo: "혀끝을 물고 목 울리며 '드'",
    mouthGuideKo:
      "혀끝을 윗니와 아랫니 사이에 살짝 댄 상태에서, 목청을 울리며 부드럽게 '드/즈' 소리를 내세요.",
    koHint: '드 (혀끝 물고 울림)',
    arpaTargets: ['DH'],
    spellingPatterns: ['th??', '*ther', '*the*', '*th????'],
  },
  {
    id: 'sym_f',
    categoryId: 'key_consonants',
    isCore: true,
    ipa: '/f/',
    titleKo: "윗니로 아랫입술 대고 '프'",
    mouthGuideKo:
      "윗니 끝을 아랫입술 안쪽에 가볍게 대고, 입술 사이로 바람을 '후—/프—' 내보내세요. (두 입술을 붙이지 마세요)",
    koHint: '프 (윗니+아랫입술)',
    arpaTargets: ['F'],
    spellingPatterns: ['f???', 'f????', 'f?????', 'f???????'],
  },
  {
    id: 'sym_v',
    categoryId: 'key_consonants',
    isCore: true,
    ipa: '/v/',
    titleKo: "윗니+아랫입술 울리며 '브'",
    mouthGuideKo:
      "/f/와 똑같이 윗니를 아랫입술에 가볍게 댄 채, 목청을 '브으—' 울려 주세요.",
    koHint: '브 (윗니+아랫입술 울림)',
    arpaTargets: ['V'],
    spellingPatterns: ['v???', 'v????', '*v????', 'v???????'],
  },
  {
    id: 'sym_r',
    categoryId: 'key_consonants',
    isCore: true,
    ipa: '/r/',
    titleKo: "혀를 입천장에 안 대고 '르'",
    mouthGuideKo:
      "입술을 살짝 오므리고 혀끝을 뒤로 살짝 말아 올리세요. 혀가 입천장에 닿지 않게 '우르'처럼 소리 냅니다.",
    koHint: '르 (혀 안 닿게)',
    arpaTargets: ['R'],
    spellingPatterns: ['r???', 'r????', 'r?????', 'r???????'],
  },
  {
    id: 'sym_l',
    categoryId: 'key_consonants',
    isCore: true,
    ipa: '/l/',
    titleKo: "혀끝을 윗니 뒤에 붙이고 '을'",
    mouthGuideKo:
      "혀끝을 윗니 바로 뒤 잇몸에 확실히 붙인 상태에서 부드럽게 '을/를' 소리를 내세요.",
    koHint: '을/를 (혀끝 윗니 뒤)',
    arpaTargets: ['L'],
    spellingPatterns: ['l???', 'l????', 'l?????', 'l???????'],
  },
  {
    id: 'sym_sh',
    categoryId: 'key_consonants',
    isCore: false,
    ipa: '/ʃ/',
    titleKo: "입술 앞으로 내밀고 '쉬'",
    mouthGuideKo:
      "조용히 하라고 할 때 '쉬—' 하듯 입술을 동그랗게 앞으로 내밀고 부드럽게 바람을 내보내세요.",
    koHint: '쉬 (입술 내밀고 바람)',
    arpaTargets: ['SH'],
    spellingPatterns: ['sh??', 'sh???', '*sh???', '*tion'],
  },
  {
    id: 'sym_zh',
    categoryId: 'key_consonants',
    isCore: false,
    ipa: '/ʒ/',
    titleKo: "입술 내밀고 목 울리며 '쥐'",
    mouthGuideKo:
      "'쉬(/ʃ/)'와 입 모양은 똑같이 입술을 내민 채, 목청을 '쥐—/지—' 부드럽게 울려 주세요.",
    koHint: '쥐 (입술 내밀고 울림)',
    arpaTargets: ['ZH'],
    spellingPatterns: ['*sion', '*sure', '*sual*', '*age'],
  },
  {
    id: 'sym_ch',
    categoryId: 'key_consonants',
    isCore: false,
    ipa: '/tʃ/',
    titleKo: "입술 모으고 톡 터뜨려 '취'",
    mouthGuideKo:
      "입술을 앞으로 살짝 내밀고 혀끝으로 숨을 잠깐 막았다가 힘 있게 '취/치' 터뜨려 보세요.",
    koHint: '취/치 (입술 모으고 톡)',
    arpaTargets: ['CH'],
    spellingPatterns: ['ch??', 'ch???', 'ch?????', '*ch????'],
  },
  {
    id: 'sym_jh',
    categoryId: 'key_consonants',
    isCore: false,
    ipa: '/dʒ/',
    titleKo: "입술 모으고 목 울리며 '쥐'",
    mouthGuideKo:
      "'취(/tʃ/)'와 같은 입 모양에서 목청을 울리며 힘 있게 '쥐/지' 소리를 내세요.",
    koHint: '쥐/지 (힘 있게 울림)',
    arpaTargets: ['JH'],
    spellingPatterns: ['j???', '*ge', 'g?????', '*g??????'],
  },
  {
    id: 'sym_z',
    categoryId: 'key_consonants',
    isCore: false,
    ipa: '/z/',
    titleKo: "벌 윙윙 울리듯 '즈'",
    mouthGuideKo:
      "윗니와 아랫니를 가볍게 가까이 대고, 목청을 진동시키며 꿀벌 소리처럼 '즈으—' 울려 주세요.",
    koHint: '즈 (목청 윙윙 울림)',
    arpaTargets: ['Z'],
    spellingPatterns: ['*se', '*si??', '*ze', '*z?????'],
  },
  {
    id: 'sym_ng',
    categoryId: 'key_consonants',
    isCore: false,
    ipa: '/ŋ/',
    titleKo: "코로 울리는 받침 '응'",
    mouthGuideKo:
      "입을 살짝 벌리고 혀 뒤쪽을 입천장 안쪽에 댄 채, 코로 부드럽게 '응—' 울려 주세요. (뒤에 '그'를 붙이지 마세요)",
    koHint: '응 (코 울림 받침)',
    arpaTargets: ['NG'],
    spellingPatterns: ['??ng', '???ng', '????ng', '*ng????'],
  },
  {
    id: 'sym_w',
    categoryId: 'key_consonants',
    isCore: false,
    ipa: '/w/',
    titleKo: "입술 오므렸다 펴며 '우어'",
    mouthGuideKo:
      "휘파람 불듯 입술을 동그랗게 꼭 오므렸다가, 바로 뒤 모음으로 힘 있게 펴며 '우어' 소리 내세요.",
    koHint: '우어 (입술 오므렸다 펴기)',
    arpaTargets: ['W'],
    spellingPatterns: ['w???', 'w????', 'w?????', 'w???????'],
  },
  {
    id: 'sym_y',
    categoryId: 'key_consonants',
    isCore: false,
    ipa: '/j/',
    titleKo: "'이'에서 미끄러지듯 '이여'",
    mouthGuideKo:
      "발음기호 j는 한글 'ㅈ'이 아니라 '이' 소리입니다! 짧게 '이'로 시작해 뒤 모음으로 부드럽게 이어 주세요.",
    koHint: "이여 (j는 '이' 소리!)",
    arpaTargets: ['Y'],
    spellingPatterns: ['y???', 'y????', '*u????', '*u??????'],
  },

  // =========================================================================
  // 4. 기본 자음 (basic_consonants: 10개)
  // =========================================================================
  {
    id: 'sym_p',
    categoryId: 'basic_consonants',
    isCore: false,
    ipa: '/p/',
    titleKo: "두 입술 모았다 터뜨려 '프'",
    mouthGuideKo:
      "윗입술과 아랫입술을 꼭 붙였다가 목을 울리지 않고 바람을 '픗!' 하고 시원하게 터뜨리세요.",
    koHint: '프 (두 입술 바람)',
    arpaTargets: ['P'],
    spellingPatterns: ['p???', 'p????', 'p?????', 'p???????'],
  },
  {
    id: 'sym_b',
    categoryId: 'basic_consonants',
    isCore: false,
    ipa: '/b/',
    titleKo: "두 입술 모았다 울리며 '브'",
    mouthGuideKo:
      "두 입술을 꼭 붙였다가 떼면서 목청을 힘 있게 울려 '브' 소리를 내세요. (/v/와 달리 두 입술을 붙입니다)",
    koHint: '브 (두 입술 울림)',
    arpaTargets: ['B'],
    spellingPatterns: ['b???', 'b????', 'b?????', 'b???????'],
  },
  {
    id: 'sym_t',
    categoryId: 'basic_consonants',
    isCore: false,
    ipa: '/t/',
    titleKo: "혀끝 윗니 뒤에서 톡 '트'",
    mouthGuideKo:
      "혀끝을 윗니 바로 뒤 잇몸에 대고 숨을 잠깐 막았다가 톡 떼면서 맑은 바람 소리 '트'를 내세요.",
    koHint: '트 (혀끝 톡 터뜨림)',
    arpaTargets: ['T'],
    spellingPatterns: ['t???', 't????', 't?????', 't???????'],
  },
  {
    id: 'sym_d',
    categoryId: 'basic_consonants',
    isCore: false,
    ipa: '/d/',
    titleKo: "혀끝 윗니 뒤에서 울리며 '드'",
    mouthGuideKo:
      "'트(/t/)'와 같은 위치에 혀끝을 대고, 목청을 울리며 부드럽게 '드' 소리를 내세요.",
    koHint: '드 (혀끝 울림)',
    arpaTargets: ['D'],
    spellingPatterns: ['d???', 'd????', 'd?????', 'd???????'],
  },
  {
    id: 'sym_k',
    categoryId: 'basic_consonants',
    isCore: false,
    ipa: '/k/',
    titleKo: "혀 뒤쪽에서 바람 터뜨려 '크'",
    mouthGuideKo:
      "혀 뒤쪽을 입천장 안쪽에 붙였다가 목을 울리지 않고 시원하게 '크' 바람을 터뜨리세요.",
    koHint: '크 (시원한 바람)',
    arpaTargets: ['K'],
    spellingPatterns: ['k???', 'c????', 'c?????', 'c???????'],
  },
  {
    id: 'sym_g',
    categoryId: 'basic_consonants',
    isCore: false,
    ipa: '/ɡ/',
    titleKo: "혀 뒤쪽에서 울리며 '그'",
    mouthGuideKo:
      "'크(/k/)'와 같은 위치에서 목청을 울리며 묵직하고 부드럽게 '그' 소리를 내세요.",
    koHint: '그 (목 안쪽 울림)',
    arpaTargets: ['G'],
    spellingPatterns: ['g???', 'g????', 'g?????', 'g???????'],
  },
  {
    id: 'sym_m',
    categoryId: 'basic_consonants',
    isCore: false,
    ipa: '/m/',
    titleKo: "두 입술 다물고 콧소리 '므'",
    mouthGuideKo:
      "윗입술과 아랫입술을 편안하게 꼭 다문 상태에서 코로 부드럽게 '음—/므' 울려 주세요.",
    koHint: '므/음 (입술 다물고 코 울림)',
    arpaTargets: ['M'],
    spellingPatterns: ['m???', 'm????', 'm?????', 'm???????'],
  },
  {
    id: 'sym_n',
    categoryId: 'basic_consonants',
    isCore: false,
    ipa: '/n/',
    titleKo: "혀끝 윗니 뒤에 대고 '느'",
    mouthGuideKo:
      "혀끝을 윗니 바로 뒤 잇몸에 대고 코로 부드럽게 '느/은' 콧소리를 내세요.",
    koHint: '느/은 (혀끝 윗니 뒤 콧소리)',
    arpaTargets: ['N'],
    spellingPatterns: ['n???', 'n????', 'n?????', 'n???????'],
  },
  {
    id: 'sym_s',
    categoryId: 'basic_consonants',
    isCore: false,
    ipa: '/s/',
    titleKo: "맑고 가벼운 바람 '스'",
    mouthGuideKo:
      "윗니와 아랫니 사이를 살짝 닫고 목을 울리지 않은 채 맑고 가느다란 바람 소리 '스—'를 내세요.",
    koHint: '스 (맑은 바람 소리)',
    arpaTargets: ['S'],
    spellingPatterns: ['s???', 's????', 's?????', 's???????'],
  },
  {
    id: 'sym_h',
    categoryId: 'basic_consonants',
    isCore: false,
    ipa: '/h/',
    titleKo: "입김 불듯 부드럽게 '흐'",
    mouthGuideKo:
      "추운 날 손에 '하—' 입김을 불듯 목에 힘 주지 않고 따뜻한 숨만 부드럽게 내쉬세요.",
    koHint: '흐 (부드러운 입김)',
    arpaTargets: ['HH'],
    spellingPatterns: ['h???', 'h????', 'h?????', 'h???????'],
  },
];
