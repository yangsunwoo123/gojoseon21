/* 데이터베이스에 아직 저장된 내용이 없을 때 보여 주는 기본 내용입니다.
   팀원이 사이트에서 한 번 저장하면 그 뒤로는 저장된 내용이 쓰입니다. */

const blank = (name, role, lead) => ({
  name, role, lead: !!lead,
  quote: '', photo: '', email: '', link: '', bio: '',
  skills: [], history: [], projects: [], works: []
});

export const DEFAULT_SITE = {
  projectsSub: '고조선이 만들고 운영하는 서비스',
  teamSub: '고조선을 만드는 사람들',
  projects: [
    {
      id: 'academy', label: '교육', name: '고조선 바이브코딩 아카데미',
      desc: '코딩을 몰라도 시작할 수 있는 바이브코딩 강의입니다. 가입 없이 2분 레벨 테스트로 내 수준을 찾고, 5개 트랙 56개 레슨을 직접 따라 하며 첫 앱 배포부터 AI 에이전트 팀까지 배웁니다.',
      url: 'https://vibecoding-training.pages.dev/', image: '', art: 'academy', tone: 'ink'
    },
    {
      id: 'kids', label: '키즈 · 아트', name: '키즈아트버스',
      desc: '아이가 그린 그림 한 장을 AI로 예쁜 작품으로 바꿔, 키링·티셔츠·폰케이스 같은 세상에 하나뿐인 굿즈로 남기는 어린이 창작 플랫폼입니다. 굿즈 시안은 무료로 만들어 볼 수 있습니다.',
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
