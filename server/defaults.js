/* 데이터베이스에 아직 저장된 내용이 없을 때 보여 주는 기본 내용입니다.
   팀원이 사이트에서 한 번 저장하면 그 뒤로는 저장된 내용이 쓰입니다. */

const blank = (name, role, lead) => ({
  name, role, lead: !!lead,
  quote: '', photo: '', email: '', link: '', bio: '',
  skills: [], history: [], projects: [], works: []
});

export const DEFAULT_SITE = {
  home: {
    eyebrow: 'GOJOSEON',
    tag: 'AI · Vibe Coding',
    title1: '오래된 이름으로,',
    titleEm: '새로운 것을',
    title2: '만듭니다.',
    sub: '고조선은 AI와 바이브코딩으로 교육과 창작의 새로운 방식을 만드는 팀입니다.'
  },
  projectsSub: '고조선이 만들고 운영하는 서비스',
  teamSub: '고조선을 만드는 사람들',
  projects: [
    {
      id: 'academy', label: '교육', name: '고조선 바이브코딩 아카데미',
      desc: '코드를 몰라도 괜찮습니다. AI와 대화하며 아이디어를 실제 서비스로 만드는 바이브코딩 교육 과정입니다.',
      url: 'https://vibecoding-training.pages.dev/', image: '', art: 'academy', tone: 'ink'
    },
    {
      id: 'kids', label: '키즈 · 아트', name: '키즈아트버스',
      desc: '아이들의 그림이 작품이 되고 세계가 되는 곳. 어린이를 위한 온라인 아트 공간입니다.',
      url: 'https://kidsartverse.store/', image: '', art: 'kids', tone: 'tint'
    }
  ],
  team: ['yang-sunwoo', 'ju-yongseok', 'park-chanseo', 'lim-dangun'],
  contact: {
    text: '함께 만들고 싶은 것이 있다면 편하게 연락 주세요.',
    email: 'gojoseon21@gmail.com',
    phone: '010-8472-6136'
  },
  biz: { name: '고조선', ceo: '양선우', regNo: '637-53-00996', mailOrderNo: '제2026-인천연수구-2871호' }
};

export const DEFAULT_MEMBERS = {
  'yang-sunwoo': blank('양선우', '팀장', true),
  'ju-yongseok': blank('주용석', '팀원'),
  'park-chanseo': blank('박찬서', '팀원'),
  'lim-dangun': blank('임단군', '팀원')
};
