const questionBank = [
  {
    text: 'В чем разница между блочными и строчными элементами?',
    answer:
      'Блочные элементы занимают всю доступную ширину и обычно начинаются с новой строки. Строчные располагаются в потоке текста и занимают ширину по содержимому.',
    difficulty: 1,
    topics: ['HTML'],
  },
  {
    text: 'Что такое HTML и какую роль он играет в веб-странице?',
    answer:
      'HTML описывает структуру документа: заголовки, абзацы, ссылки, формы и медиа. Браузер парсит его и строит DOM-дерево.',
    difficulty: 1,
    topics: ['HTML'],
  },
  {
    text: 'Из каких основных частей состоит HTML-документ?',
    answer:
      'Минимальный документ состоит из doctype, html, head и body. В head лежат метаданные и ресурсы, в body находится отображаемый контент.',
    difficulty: 1,
    topics: ['HTML'],
  },
  {
    text: 'Что такое DOM?',
    answer:
      'DOM - это объектная модель документа. Она представляет HTML как дерево узлов, с которым можно работать из JavaScript.',
    difficulty: 1,
    topics: ['HTML', 'JavaScript'],
  },
  {
    text: 'Чем отличается div от span?',
    answer:
      'div обычно используется как блочный контейнер, span - как строчный. Оба тега сами по себе не несут семантики.',
    difficulty: 1,
    topics: ['HTML'],
  },
  {
    text: 'Что такое семантические теги?',
    answer:
      'Это теги, которые описывают смысл контента: header, nav, main, article, section, footer. Они улучшают доступность и помогают SEO.',
    difficulty: 1,
    topics: ['HTML'],
  },
  {
    text: 'Чем iframe отличается от обычного DOM-встраивания HTML?',
    answer:
      'iframe создаёт отдельный browsing context со своим document, JavaScript-контекстом и origin. Встроенный в DOM HTML остаётся частью текущего документа.',
    difficulty: 2,
    topics: ['HTML', 'Browser APIs'],
  },
  {
    text: 'Чем box-sizing: border-box отличается от content-box?',
    answer:
      'У content-box заданная ширина учитывает только контент. У border-box в ширину уже входят padding и border.',
    difficulty: 1,
    topics: ['CSS'],
  },
  {
    text: 'Что делает position: relative?',
    answer:
      'Элемент остаётся в нормальном потоке, но получает позиционный контекст. От него потом могут позиционироваться absolute-элементы.',
    difficulty: 1,
    topics: ['CSS'],
  },
  {
    text: 'Чем absolute отличается от fixed?',
    answer:
      'absolute позиционируется относительно ближайшего positioned-родителя. fixed позиционируется относительно viewport.',
    difficulty: 1,
    topics: ['CSS'],
  },
  {
    text: 'Что делает z-index и когда он работает?',
    answer:
      'z-index управляет порядком наложения элементов по оси Z. Обычно он работает у positioned-элементов и в контексте наложения.',
    difficulty: 1,
    topics: ['CSS'],
  },
  {
    text: 'В чем разница между margin и padding?',
    answer:
      'margin - внешний отступ снаружи элемента. padding - внутренний отступ между контентом и границей элемента.',
    difficulty: 1,
    topics: ['CSS'],
  },
  {
    text: 'Что такое Flexbox?',
    answer:
      'Flexbox - одномерная система layout для распределения элементов по строке или колонке.',
    difficulty: 1,
    topics: ['CSS'],
  },
  {
    text: 'Чем justify-content отличается от align-items?',
    answer:
      'justify-content управляет выравниванием по основной оси flex-контейнера. align-items работает по поперечной оси.',
    difficulty: 2,
    topics: ['CSS'],
  },
  {
    text: 'Что делает flex: 1?',
    answer:
      'Обычно это сокращение для flex-grow: 1, flex-shrink: 1, flex-basis: 0. Элемент растягивается и делит доступное пространство с соседями.',
    difficulty: 2,
    topics: ['CSS'],
  },
  {
    text: 'Что такое CSS Grid и чем он отличается от Flexbox?',
    answer:
      'Grid - двумерная система раскладки по строкам и колонкам. Flexbox - одномерная система для одной оси.',
    difficulty: 2,
    topics: ['CSS'],
  },
  {
    text: 'Когда лучше использовать Grid вместо Flexbox?',
    answer:
      'Когда layout зависит одновременно и от строк, и от колонок. Для линейных рядов и колонок обычно достаточно Flexbox.',
    difficulty: 2,
    topics: ['CSS'],
  },
  {
    text: 'Как работает overflow: hidden, auto и scroll?',
    answer:
      'overflow управляет отображением содержимого, выходящего за пределы контейнера. hidden обрезает, auto показывает скролл при необходимости, scroll держит скролл всегда.',
    difficulty: 2,
    topics: ['CSS'],
  },
  {
    text: 'Чем visibility: hidden отличается от display: none?',
    answer:
      'visibility: hidden скрывает элемент, но сохраняет его место в layout. display: none убирает элемент из layout полностью.',
    difficulty: 2,
    topics: ['CSS'],
  },
  {
    text: 'Чем отличаются rem, em, %, vw?',
    answer:
      'rem считается от root font-size, em - от контекста родителя или самого элемента, % - от базового размера контейнера, vw - от ширины viewport.',
    difficulty: 2,
    topics: ['CSS'],
  },
  {
    text: 'Что такое margin collapsing?',
    answer:
      'Это схлопывание вертикальных margin соседних блоков, когда итоговый внешний отступ не суммируется линейно, а берётся по правилам коллапса.',
    difficulty: 3,
    topics: ['CSS'],
  },
  {
    text: 'Какие CSS-свойства анимируются быстрее всего?',
    answer:
      'Обычно быстрее всего анимировать transform и opacity, потому что они часто обрабатываются на compositor layer без полного reflow.',
    difficulty: 3,
    topics: ['CSS', 'Performance'],
  },
  {
    text: 'Почему top и left хуже для анимаций, чем transform?',
    answer:
      'top и left часто заставляют браузер пересчитывать layout и repaint. transform обычно можно выполнить без тяжёлого reflow.',
    difficulty: 3,
    topics: ['CSS', 'Performance'],
  },
  {
    text: 'Что обычно вызывает reflow?',
    answer:
      'Изменение размеров, шрифтов, DOM-структуры, display, width, height и других layout-зависимых свойств.',
    difficulty: 3,
    topics: ['CSS', 'Performance'],
  },
  {
    text: 'Что такое repaint?',
    answer:
      'Repaint - это перерисовка пикселей без пересчёта геометрии layout.',
    difficulty: 3,
    topics: ['CSS', 'Performance'],
  },
  {
    text: 'Какие основные типы данных есть в JavaScript?',
    answer:
      'string, number, boolean, null, undefined, symbol, bigint и object.',
    difficulty: 1,
    topics: ['JavaScript'],
  },
  {
    text: 'Чем == отличается от ===?',
    answer:
      '== допускает приведение типов перед сравнением. === сравнивает без приведения типов.',
    difficulty: 1,
    topics: ['JavaScript'],
  },
  {
    text: 'Что такое scope в JavaScript?',
    answer:
      'Scope - это область видимости переменных. В JavaScript есть глобальная, функциональная и блочная области видимости.',
    difficulty: 2,
    topics: ['JavaScript'],
  },
  {
    text: 'Чем lexical scope отличается от dynamic scope?',
    answer:
      'В JavaScript используется lexical scope: область видимости определяется местом объявления функции, а не местом её вызова.',
    difficulty: 2,
    topics: ['JavaScript'],
  },
  {
    text: 'Что такое closure и где он используется?',
    answer:
      'Closure - это функция, которая сохраняет доступ к переменным внешней области даже после завершения внешней функции. Часто используется для инкапсуляции и фабрик функций.',
    difficulty: 2,
    topics: ['JavaScript'],
  },
  {
    text: 'Что такое prototype chain?',
    answer:
      'Это механизм наследования, при котором поиск свойства идёт по цепочке прототипов вверх до Object.prototype.',
    difficulty: 2,
    topics: ['JavaScript'],
  },
  {
    text: 'Что такое Event Loop?',
    answer:
      'Event Loop координирует выполнение синхронного кода, микрозадач и макрозадач. Он запускает следующий шаг, когда стек вызовов становится пустым.',
    difficulty: 2,
    topics: ['JavaScript', 'Async'],
  },
  {
    text: 'Чем microtask queue отличается от macrotask queue?',
    answer:
      'Microtasks выполняются сразу после завершения текущего стека и до следующей макрозадачи. Macrotasks выполняются по одной на итерацию цикла.',
    difficulty: 2,
    topics: ['JavaScript', 'Async'],
  },
  {
    text: 'Какие задачи относятся к microtasks?',
    answer:
      'К микрозадачам относятся Promise.then, queueMicrotask, MutationObserver и продолжение async-функции после await.',
    difficulty: 2,
    topics: ['JavaScript', 'Async'],
  },
  {
    text: 'Как работает garbage collector?',
    answer:
      'Сборщик мусора освобождает память объектов, которые стали недостижимыми из корневых ссылок.',
    difficulty: 3,
    topics: ['JavaScript', 'Memory'],
  },
  {
    text: 'Для чего нужен Event Loop и как он работает?',
    answer:
      'Сначала выполняется весь синхронный код в Call Stack. Когда стек пуст, выполняются все микрозадачи, затем одна макрозадача, после чего цикл повторяется.',
    difficulty: 1,
    topics: ['JavaScript', 'Async', 'Event Loop'],
  },
  {
    text: 'Что выведет код с Promise.resolve().then(1), setTimeout(2), Promise.resolve().then(3), console.log(4)?',
    answer:
      'Вывод будет 4, 1, 3, 2. Сначала синхронный лог, потом две микрозадачи, затем макрозадача setTimeout.',
    difficulty: 1,
    topics: ['JavaScript', 'Async', 'Event Loop'],
  },
  {
    text: 'Что выведет код со строками script start, script end, promise1, promise2 и setTimeout?',
    answer:
      'Сначала script start и script end, затем promise1 и promise2, и только после этого setTimeout. Цепочка then даёт последовательные microtask.',
    difficulty: 1,
    topics: ['JavaScript', 'Async', 'Event Loop'],
  },
  {
    text: 'Что такое Promise и для чего он используется?',
    answer:
      'Promise представляет результат асинхронной операции, который станет доступен позже. У него есть состояния pending, fulfilled и rejected.',
    difficulty: 1,
    topics: ['JavaScript', 'Async', 'Promises'],
  },
  {
    text: 'Что такое async/await?',
    answer:
      'Это синтаксический сахар над промисами. async-функция всегда возвращает Promise, а await ставит продолжение функции в microtask без блокировки main thread.',
    difficulty: 1,
    topics: ['JavaScript', 'Async', 'Promises'],
  },
  {
    text: 'Почему тяжёлые вычисления блокируют страницу?',
    answer:
      'JavaScript выполняется в одном потоке. Пока тяжёлый синхронный код занимает Call Stack, браузер не может обработать события, перерисовку и очереди задач.',
    difficulty: 1,
    topics: ['JavaScript', 'Async', 'Performance'],
  },
  {
    text: 'Что выведет код: start, new Promise с console.log(1) без resolve, then с console.log(2), end?',
    answer:
      'Вывод будет start, 1, end. Значение 2 не появится, потому что промис останется в состоянии pending.',
    difficulty: 1,
    topics: ['JavaScript', 'Async', 'Promises'],
  },
  {
    text: 'Что выведет код с Promise.resolve(1), Promise.resolve(2), start и end?',
    answer:
      'Сначала start и end, затем 1 и 2. Оба then попадают в microtask queue в порядке объявления.',
    difficulty: 1,
    topics: ['JavaScript', 'Async', 'Promises'],
  },
  {
    text: 'Что относится к макрозадачам, а что к микрозадачам?',
    answer:
      'К макрозадачам относятся setTimeout, setInterval, I/O и MessageChannel. К микрозадачам относятся Promise.then, queueMicrotask, MutationObserver и продолжения после await.',
    difficulty: 2,
    topics: ['JavaScript', 'Async', 'Event Loop'],
  },
  {
    text: 'Что выведет task1 с логами 1, 3, 6, setTimeout и resolve/reject внутри Promise?',
    answer:
      'Вывод будет 1, 3, 6, 2, 4. Executor промиса синхронный, первый setTimeout отрабатывает раньше resolve, а reject после resolve игнорируется.',
    difficulty: 2,
    topics: ['JavaScript', 'Async', 'Promises'],
  },
  {
    text: 'Что выведет цепочка failedJob с несколькими then, catch и финальным then?',
    answer:
      'Сначала сработает catch и выведет Error 1, потом выполнится следующий then и выведет Success 4. После catch цепочка снова становится resolved.',
    difficulty: 2,
    topics: ['JavaScript', 'Async', 'Promises'],
  },
  {
    text: 'Когда в цикле Event Loop выполняется requestAnimationFrame?',
    answer:
      'requestAnimationFrame вызывается перед отрисовкой следующего кадра, после микрозадач и между итерациями задач.',
    difficulty: 2,
    topics: ['JavaScript', 'Async', 'Browser APIs'],
  },
  {
    text: 'Как запросить массив URL параллельно и вернуть результаты в исходном порядке?',
    answer:
      'Нужно использовать Promise.all поверх urls.map(fetch...). Promise.all сохраняет порядок результатов в соответствии с порядком входного массива.',
    difficulty: 2,
    topics: ['JavaScript', 'Async', 'Fetch'],
  },
  {
    text: 'Что выведет код: start, new Promise с console.log(1), resolve(2), console.log(3), then и end?',
    answer:
      'Вывод будет start, 1, 3, end, 2. resolve не останавливает executor, поэтому код после него продолжает выполняться синхронно.',
    difficulty: 2,
    topics: ['JavaScript', 'Async', 'Promises'],
  },
  {
    text: 'Что выведет код: start, middle, вызов fn с Promise и then, end?',
    answer:
      'Вывод будет start, middle, 1, end, success. Executor промиса выполнится синхронно в момент вызова fn, а then уйдёт в microtask.',
    difficulty: 2,
    topics: ['JavaScript', 'Async', 'Promises'],
  },
  {
    text: 'Что выведет код с timerStart, resolve(success), timerEnd и then?',
    answer:
      'Сначала 1, 2, 4, потом timerStart, timerEnd и success. resolve внутри таймера не прерывает текущий callback.',
    difficulty: 2,
    topics: ['JavaScript', 'Async', 'Promises'],
  },
  {
    text: 'Что выведет task2 с innerFunc1, innerFunc2, await и логами 2, 1, 4, 3?',
    answer:
      'Вывод будет 2, 1, 4, 3. await ставит продолжение innerFunc2 в microtask после завершения текущего синхронного кода.',
    difficulty: 3,
    topics: ['JavaScript', 'Async', 'Promises'],
  },
  {
    text: 'Что выведет код с setTimeout(1), Promise resolve, then с queueMicrotask(4) и console.log(5)?',
    answer:
      'Вывод будет 2, 5, 3, 4, 1. Сначала выполняется синхронный executor промиса, потом микрозадачи, затем макрозадача таймера.',
    difficulty: 3,
    topics: ['JavaScript', 'Async', 'Event Loop'],
  },
  {
    text: 'Что выведет код: console.log(1), setTimeout(2), Promise.reject(3).catch, Promise.resolve(5).then, console.log(6), setTimeout(7)?',
    answer:
      'Вывод будет 1, 6, 3, 5, 2, 4, 7. Catch и then на resolved промисах отрабатывают как microtask, таймеры идут позже.',
    difficulty: 3,
    topics: ['JavaScript', 'Async', 'Event Loop'],
  },
  {
    text: 'Что выведет код: 1, setTimeout(2), Promise.then(3), Promise.then(setTimeout(4)), Promise.then(5), setTimeout(6), 7?',
    answer:
      'Вывод будет 1, 7, 3, 5, 2, 6, 4. setTimeout(4) регистрируется позже остальных макрозадач, поэтому оказывается в конце очереди.',
    difficulty: 3,
    topics: ['JavaScript', 'Async', 'Event Loop'],
  },
  {
    text: 'Чем отличаются две схемы обработки ошибки: последовательные catch в цепочке и два catch на одном rejected Promise?',
    answer:
      'В цепочке первый catch перехватывает ошибку и возвращает resolved Promise, поэтому второй catch уже не вызывается. Если подписать два catch на один и тот же rejected Promise, сработают оба.',
    difficulty: 3,
    topics: ['JavaScript', 'Async', 'Promises'],
  },
  {
    text: 'Как написать полифил Promise.all?',
    answer:
      'Нужно дождаться успешного завершения всех входных промисов, сохранить значения по индексам и немедленно отклонить общий промис при первой ошибке.',
    difficulty: 3,
    topics: ['JavaScript', 'Async', 'Promises'],
  },
  {
    text: 'Как гарантированно отправить аналитику при переходе на другую страницу?',
    answer:
      'Предпочтительно использовать navigator.sendBeacon. Он не блокирует навигацию и предназначен для гарантированной фоновой отправки небольших данных.',
    difficulty: 3,
    topics: ['JavaScript', 'Browser APIs', 'Networking'],
  },
  {
    text: 'Что выведет код: Start, Promise 1, Promise 2, Timeout и End?',
    answer:
      'Вывод будет Start, End, Promise 1, Promise 2, Timeout. Когда then возвращает уже resolved Promise, следующий then всё равно остаётся в microtask.',
    difficulty: 3,
    topics: ['JavaScript', 'Async', 'Promises'],
  },
  {
    text: 'Как написать полифил Promise.allSettled?',
    answer:
      'Нужно дождаться завершения всех промисов и сохранить для каждого либо status fulfilled и value, либо status rejected и reason. Ошибка одного промиса не должна останавливать остальные.',
    difficulty: 3,
    topics: ['JavaScript', 'Async', 'Promises'],
  },
  {
    text: 'Как написать полифил Promise.race?',
    answer:
      'Нужно подписаться на все промисы и зарезолвить или зареджектить общий промис первым завершившимся результатом.',
    difficulty: 3,
    topics: ['JavaScript', 'Async', 'Promises'],
  },
  {
    text: 'Как написать полифил Promise.any?',
    answer:
      'Нужно зарезолвить общий промис первым успешным значением. Если все промисы завершились ошибкой, нужно отклонить AggregateError со списком причин.',
    difficulty: 3,
    topics: ['JavaScript', 'Async', 'Promises'],
  },
  {
    text: 'Расскажи про паттерны управления состоянием на фронтенде.',
    answer:
      'Обычно используют локальное состояние рядом с компонентом, lifting state up, Context для DI-подобных вещей, глобальный client state для shared UI-данных, отдельные инструменты для server state и хранение фильтров и пагинации в URL.',
    difficulty: 1,
    topics: ['React', 'State Management'],
  },
  {
    text: 'Что такое useReducer?',
    answer:
      'Это хук для локального управления сложным состоянием через reducer-функцию вида (state, action) => newState. Подходит, когда переходов состояния много и они явно описываются событиями.',
    difficulty: 1,
    topics: ['React', 'State Management'],
  },
  {
    text: 'Что такое history.state?',
    answer:
      'Это объект состояния, который хранится в истории браузера. В React Router его можно передавать через navigate(..., { state }) и читать на следующем экране.',
    difficulty: 2,
    topics: ['React', 'Routing'],
  },
  {
    text: 'Как выбирать библиотеку для state management?',
    answer:
      'Redux и RTK хороши для сложного shared state и строгой архитектуры. Zustand проще и легче, React Query решает server state, а локальное состояние не стоит выносить глобально без необходимости.',
    difficulty: 1,
    topics: ['React', 'State Management'],
  },
  {
    text: 'Как организовать взаимодействие между React- и Vanilla JS-частями страницы?',
    answer:
      'Подходят Custom Events, localStorage или общий store, к которому обе части умеют подписываться. Главное - держать один понятный контракт взаимодействия.',
    difficulty: 3,
    topics: ['React', 'Integration'],
  },
  {
    text: 'Как организовать общение между микрофронтами?',
    answer:
      'Чаще используют shared store, Custom Events, host-level event bus или browser storage. Выбор зависит от требований к связанности и независимости команд.',
    difficulty: 3,
    topics: ['Microfrontends', 'State Management'],
  },
  {
    text: 'Что такое Flux?',
    answer:
      'Flux - это паттерн однонаправленного потока данных: Action -> Dispatcher -> Store -> View. Он лежит в основе идей, из которых вырос Redux.',
    difficulty: 1,
    topics: ['State Management', 'Flux'],
  },
  {
    text: 'Что такое Redux и какие у него ключевые принципы?',
    answer:
      'У Redux один источник истины, состояние нельзя менять напрямую, а reducers должны быть чистыми функциями. Поток данных идёт через dispatch(action) -> reducer -> store -> UI.',
    difficulty: 1,
    topics: ['Redux'],
  },
  {
    text: 'Что такое reducer?',
    answer:
      'Reducer - это чистая функция, которая получает текущее state и action и возвращает новое state без побочных эффектов.',
    difficulty: 1,
    topics: ['Redux'],
  },
  {
    text: 'Зачем нужен combineReducers?',
    answer:
      'Он объединяет несколько reducer-функций в один корневой reducer, где каждый slice отвечает за свой кусок состояния.',
    difficulty: 1,
    topics: ['Redux', 'RTK'],
  },
  {
    text: 'Что такое selector в Redux и зачем нужен reselect?',
    answer:
      'Selector извлекает и при необходимости трансформирует данные из store. reselect даёт мемоизацию, чтобы пересчёт происходил только при изменении входных данных.',
    difficulty: 2,
    topics: ['Redux', 'RTK'],
  },
  {
    text: 'Что такое middleware в Redux?',
    answer:
      'Middleware перехватывает dispatch между отправкой action и попаданием в reducer. Через него обычно делают логирование, async-логику, ретраи и сложные эффекты.',
    difficulty: 2,
    topics: ['Redux', 'RTK'],
  },
  {
    text: 'Что такое Redux DevTools и time-travel debugging?',
    answer:
      'Redux DevTools показывает actions и state в реальном времени. Time-travel debugging позволяет откатиться к любому прошлому действию, потому что reducers чистые, а состояние иммутабельно.',
    difficulty: 2,
    topics: ['Redux', 'Tooling'],
  },
  {
    text: 'Что такое динамическое подключение reducers и зачем оно нужно?',
    answer:
      'Это загрузка reducer-ов по мере подключения модулей или микрофронтов. Подход уменьшает стартовый бандл и не тащит редко используемые slice-ы сразу.',
    difficulty: 3,
    topics: ['Redux', 'Architecture'],
  },
  {
    text: 'Что такое нормализация store в контексте оптимизации ререндеров?',
    answer:
      'Данные хранят как ids и entities вместо плоских массивов. Это упрощает точечные обновления и уменьшает лишние ререндеры.',
    difficulty: 3,
    topics: ['Redux', 'Performance'],
  },
  {
    text: 'Расскажи про ключевые API Redux Toolkit.',
    answer:
      'Базовые API - createSlice для slice reducer и action creators, createAsyncThunk для async flow и configureStore для сборки store с хорошими дефолтами.',
    difficulty: 2,
    topics: ['Redux', 'RTK'],
  },
  {
    text: 'Что такое RTK Query?',
    answer:
      'RTK Query - это слой для работы с серверными данными поверх Redux Toolkit. Он берёт на себя запросы, кэш, инвалидацию и жизненный цикл API-данных.',
    difficulty: 2,
    topics: ['Redux', 'RTK', 'Server State'],
  },
  {
    text: 'Как устроен Zustand и чем он отличается от Redux?',
    answer:
      'Zustand даёт store как хук без reducers и provider. Он проще по API и с меньшим boilerplate, но не навязывает такую строгую архитектуру, как Redux.',
    difficulty: 1,
    topics: ['Zustand', 'State Management'],
  },
  {
    text: 'Что такое React Query или TanStack Query?',
    answer:
      'Это библиотека для server state: она управляет загрузкой, кэшем, фоновыми обновлениями, мутациями и повторным использованием API-данных.',
    difficulty: 2,
    topics: ['React Query', 'Server State'],
  },
  {
    text: 'Что такое staleTime и gcTime в TanStack Query?',
    answer:
      'staleTime определяет, как долго данные считаются свежими. gcTime задаёт, сколько неиспользуемые данные живут в памяти до очистки.',
    difficulty: 2,
    topics: ['React Query', 'Server State'],
  },
  {
    text: 'В чем разница между unknown и any?',
    answer:
      'unknown безопаснее: в него можно записать что угодно, но использовать значение без сужения типа нельзя. any фактически выключает проверку типов.',
    difficulty: 1,
    topics: ['TypeScript'],
  },
  {
    text: 'Чем отличается type от interface?',
    answer:
      'Оба подходят для описания форм данных, но interface удобен для декларативного расширения и merge, а type дополнительно полезен для union, intersection и алиасов примитивов.',
    difficulty: 1,
    topics: ['TypeScript'],
  },
  {
    text: 'Какие utility types в TypeScript ты знаешь?',
    answer:
      'Часто используют Partial, Required, Pick, Omit, Record, Readonly, Exclude и ReturnType. Они помогают собирать новые типы без дублирования.',
    difficulty: 1,
    topics: ['TypeScript'],
  },
  {
    text: 'Что такое generics?',
    answer:
      'Generics - это параметризация типов. Она позволяет писать переиспользуемый код и сохранять строгую типизацию для разных входных данных.',
    difficulty: 1,
    topics: ['TypeScript'],
  },
  {
    text: 'Что такое guards в TypeScript?',
    answer:
      'Type guards позволяют сузить тип в конкретной ветке выполнения. Это могут быть встроенные проверки вроде typeof, in, instanceof или пользовательские функции-предикаты.',
    difficulty: 1,
    topics: ['TypeScript'],
  },
  {
    text: 'Почему присваивание User = ExtendedUser допустимо, а ExtendedUser = User нет?',
    answer:
      'TypeScript использует структурную типизацию. Объект с большим набором свойств можно положить в более узкий тип, но не наоборот, если обязательных свойств не хватает.',
    difficulty: 2,
    topics: ['TypeScript'],
  },
  {
    text: 'Когда будут ошибки совместимости типов для number, number | string, unknown и never?',
    answer:
      'Значение более узкого типа можно присвоить более широкому, но не наоборот без сужения. unknown нельзя присваивать в конкретный тип без проверки, а never нельзя заполнить обычным значением, хотя сам never можно присвоить куда угодно.',
    difficulty: 2,
    topics: ['TypeScript'],
  },
  {
    text: 'Как реализовать кастомный Partial только для части полей?',
    answer:
      'Обычно комбинируют Omit<T, K> и Partial<Pick<T, K>>. Так можно оставить часть полей обязательной, а выбранные сделать необязательными.',
    difficulty: 3,
    topics: ['TypeScript'],
  },
  {
    text: 'Что такое standalone component в Angular?',
    answer:
      'Это компонент, который не требует объявления в NgModule и сам указывает свои imports. Такой формат упрощает композицию и lazy-loading.',
    difficulty: 1,
    topics: ['Angular'],
  },
  {
    text: 'Зачем Angular использует dependency injection?',
    answer:
      'DI позволяет получать зависимости через injector, а не создавать их вручную внутри класса. Это упрощает переиспользование, подмену реализаций и тестирование.',
    difficulty: 1,
    topics: ['Angular'],
  },
  {
    text: 'Что делает ChangeDetectionStrategy.OnPush?',
    answer:
      'OnPush ограничивает повторную проверку компонента и запускает её только при изменении input-ссылок, событиях внутри компонента, async pipe или ручном markForCheck.',
    difficulty: 2,
    topics: ['Angular'],
  },
  {
    text: 'Когда в Angular стоит использовать route resolver, а когда guard?',
    answer:
      'Guard решает, можно ли вообще активировать маршрут. Resolver подготавливает данные перед рендером маршрута, когда переход уже разрешён.',
    difficulty: 2,
    topics: ['Angular'],
  },
  {
    text: 'Как контролировать утечки памяти в Angular-компонентах?',
    answer:
      'Нужно освобождать подписки и побочные эффекты при уничтожении компонента, использовать async pipe, takeUntilDestroyed и не держать долгоживущие ссылки без необходимости.',
    difficulty: 3,
    topics: ['Angular'],
  },
  {
    text: 'Что дают переменные в SCSS?',
    answer:
      'Они позволяют вынести повторяющиеся цвета, отступы и другие токены в именованные значения и централизованно переиспользовать их в стилях.',
    difficulty: 1,
    topics: ['SCSS'],
  },
  {
    text: 'Для чего нужна вложенность в SCSS?',
    answer:
      'Она помогает описывать связанные селекторы ближе друг к другу и уменьшает повторение префиксов, но её нужно использовать умеренно, чтобы не раздувать специфичность.',
    difficulty: 1,
    topics: ['SCSS'],
  },
  {
    text: 'Чем @mixin отличается от @extend в SCSS?',
    answer:
      '@mixin вставляет набор деклараций в каждое место использования и может принимать параметры. @extend объединяет селекторы и подходит только для очень контролируемого наследования.',
    difficulty: 2,
    topics: ['SCSS'],
  },
  {
    text: 'Зачем в SCSS нужны partial-файлы и директива @use?',
    answer:
      'Partial-файлы разбивают стили на модули, а @use подключает их как именованные модули с контролируемой областью видимости. Это делает зависимости явными.',
    difficulty: 2,
    topics: ['SCSS'],
  },
  {
    text: 'Почему @use предпочтительнее старого @import в SCSS?',
    answer:
      '@use подключает модуль один раз, не засоряет глобальную область и делает источник переменных и миксинов явным. @import дублирует подключения и плохо масштабируется.',
    difficulty: 3,
    topics: ['SCSS'],
  },
  {
    text: 'Что хранится в store в NgRx?',
    answer:
      'Store хранит единое предсказуемое состояние приложения. Доступ к нему идёт через selectors, а изменения происходят через actions и reducers.',
    difficulty: 1,
    topics: ['NgRx'],
  },
  {
    text: 'Зачем в NgRx нужны actions?',
    answer:
      'Action описывает доменное событие и служит единым входом для изменений состояния или запуска побочных эффектов. Он не содержит бизнес-логики исполнения.',
    difficulty: 1,
    topics: ['NgRx'],
  },
  {
    text: 'Чем reducer отличается от effect в NgRx?',
    answer:
      'Reducer синхронно и чисто вычисляет новое состояние. Effect реагирует на actions и выполняет внешние побочные эффекты вроде HTTP-запросов.',
    difficulty: 2,
    topics: ['NgRx'],
  },
  {
    text: 'Зачем в NgRx использовать selectors вместо чтения состояния напрямую?',
    answer:
      'Selector инкапсулирует форму чтения состояния, даёт мемоизацию и не размазывает знание о структуре store по компонентам.',
    difficulty: 2,
    topics: ['NgRx'],
  },
  {
    text: 'Когда в NgRx стоит нормализовать entity state?',
    answer:
      'Когда нужно хранить коллекции с быстрым доступом по id, переиспользовать элементы в нескольких представлениях и упрощать частичные обновления без глубоких копий.',
    difficulty: 3,
    topics: ['NgRx'],
  },
  {
    text: 'Что такое localStorage и чем он отличается от sessionStorage?',
    answer:
      'Оба дают простое key-value хранилище в браузере. localStorage сохраняется между перезапусками вкладки и браузера, а sessionStorage живёт только в рамках конкретной вкладки и очищается после её закрытия.',
    difficulty: 1,
    topics: ['Browser APIs'],
  },
  {
    text: 'Что возвращает fetch и когда он перейдёт в reject?',
    answer:
      'fetch возвращает Promise<Response>. Обычно он уходит в reject только при сетевой ошибке, отмене через AbortController или блокировке запроса, а HTTP 4xx и 5xx нужно проверять через response.ok или status.',
    difficulty: 1,
    topics: ['Fetch'],
  },
  {
    text: 'Как отменить устаревший fetch-запрос при смене фильтра или экрана?',
    answer:
      'Обычно создают AbortController, передают signal в fetch и вызывают abort перед новым запросом или при unmount. Это останавливает ненужный запрос и снижает риск race condition, когда старый ответ затирает новый.',
    difficulty: 3,
    topics: ['Fetch', 'Async', 'Browser APIs'],
  },
  {
    text: 'Что даёт однонаправленный поток данных в Flux-подходе?',
    answer:
      'Изменения проходят по предсказуемому маршруту событие -> изменение state -> обновление UI. Это упрощает отладку, воспроизведение проблем и контроль побочных эффектов.',
    difficulty: 2,
    topics: ['Flux', 'State Management'],
  },
  {
    text: 'Почему несколько независимых источников истины усложняют Flux-архитектуру?',
    answer:
      'Когда одно и то же состояние живёт в нескольких store, их легко рассинхронизировать и сложнее понять, кто владелец данных. Однонаправленный поток теряет предсказуемость, а восстановление причин изменений становится дороже.',
    difficulty: 3,
    topics: ['Flux', 'Architecture'],
  },
  {
    text: 'Что такое граница модуля в frontend-архитектуре?',
    answer:
      'Это явное разделение ответственности: что модуль хранит, какие данные отдаёт наружу и через какие публичные API с ним можно работать. Чёткие границы уменьшают связность и упрощают замену реализации.',
    difficulty: 1,
    topics: ['Architecture'],
  },
  {
    text: 'Зачем заранее договариваться о публичном контракте между микрофронтами или модулями?',
    answer:
      'Контракт фиксирует события, props, URL, формат данных и точки интеграции. Это позволяет развивать части системы независимо и снижает риск скрытых зависимостей.',
    difficulty: 2,
    topics: ['Architecture', 'Microfrontends'],
  },
  {
    text: 'Почему плохая HTML-семантика создаёт проблемы не только для SEO?',
    answer:
      'Неподходящие теги ухудшают навигацию для screen reader, усложняют автоматизацию тестов и делают поведение интерфейса менее предсказуемым для браузерных эвристик. Семантика нужна как машинный контракт страницы, а не только как сигнал поисковику.',
    difficulty: 3,
    topics: ['HTML'],
  },
  {
    text: 'Что проверяет интеграционный тест?',
    answer:
      'Он проверяет, что несколько реальных частей системы корректно работают вместе: например, controller, service, repository и база данных. Цель не изолировать зависимости, а проверить их стык.',
    difficulty: 1,
    topics: ['Integration'],
  },
  {
    text: 'Когда интеграционный тест полезнее unit-теста?',
    answer:
      'Когда риск сидит на границах: SQL, сериализация, DI, конфиги, транзакции, интеграция с роутингом или побочными эффектами. Unit-тест может пройти, даже если связка компонентов в реальном приложении сломана.',
    difficulty: 2,
    topics: ['Integration'],
  },
  {
    text: 'Что такое утечка памяти в веб-приложении?',
    answer:
      'Это ситуация, когда память продолжает удерживаться объектами, которые уже не нужны приложению. В результате вкладка разрастается по памяти, начинает тормозить и может упасть.',
    difficulty: 1,
    topics: ['Memory'],
  },
  {
    text: 'Почему забытые event listeners, timers и subscriptions часто вызывают утечки памяти?',
    answer:
      'Они продолжают удерживать ссылки на компоненты, DOM-узлы или callback даже после ухода со страницы. Пока ссылка жива, сборщик мусора не может освободить связанную память.',
    difficulty: 2,
    topics: ['Memory', 'Browser APIs'],
  },
  {
    text: 'Что такое микрофронтенд?',
    answer:
      'Это подход, где большой frontend делят на независимо развиваемые части с собственным жизненным циклом поставки. Обычно каждая часть отвечает за свою доменную область, а не просто за кусок layout.',
    difficulty: 1,
    topics: ['Microfrontends'],
  },
  {
    text: 'Чем HTTP отличается от HTTPS?',
    answer:
      'HTTPS - это HTTP поверх TLS. Он шифрует трафик, защищает от подмены и позволяет удостовериться, что клиент говорит именно с нужным сервером.',
    difficulty: 1,
    topics: ['Networking'],
  },
  {
    text: 'Из каких основных этапов складывается время сетевого запроса?',
    answer:
      'Обычно это DNS-резолвинг, установление TCP или TLS-соединения, отправка запроса, ожидание первого байта ответа и передача тела. На практике время может тратиться на каждом из этих этапов, а не только на backend.',
    difficulty: 2,
    topics: ['Networking'],
  },
  {
    text: 'Когда уместны debounce и throttle?',
    answer:
      'Debounce удобен для действий после паузы, например поиска по вводу. Throttle ограничивает частоту вызовов на длинной серии событий, например scroll или resize.',
    difficulty: 2,
    topics: ['Performance'],
  },
  {
    text: 'Чем server state отличается от client state?',
    answer:
      'Server state приходит из внешнего источника и может устареть независимо от UI, поэтому ему нужны загрузка, кэш, повторные запросы и инвалидация. Client state живёт внутри интерфейса и обычно полностью контролируется приложением.',
    difficulty: 1,
    topics: ['React Query', 'Server State'],
  },
  {
    text: 'Почему query keys и правила инвалидации в React Query нужно проектировать явно?',
    answer:
      'Ключи определяют гранулярность кэша и то, какие данные считаются одинаковыми. Плохая схема keys или случайная invalidation приводят либо к устаревшим данным, либо к лишним refetch и дублированию кэша.',
    difficulty: 3,
    topics: ['React Query', 'Server State'],
  },
  {
    text: 'Что такое client-side routing в SPA?',
    answer:
      'Это переключение экранов на клиенте без полной перезагрузки HTML-документа. Приложение меняет URL и рендерит нужный экран внутри уже загруженного bundle.',
    difficulty: 1,
    topics: ['Routing'],
  },
  {
    text: 'Почему важное состояние экрана стоит отражать в URL?',
    answer:
      'URL даёт воспроизводимость, ссылки, историю браузера и восстановление состояния после перезагрузки. Если фильтры, вкладки или pagination спрятаны только во внутреннем store, экран трудно шарить и отлаживать.',
    difficulty: 3,
    topics: ['Routing', 'Architecture'],
  },
  {
    text: 'Когда в Redux Toolkit оправдан createEntityAdapter?',
    answer:
      'Когда нужно часто читать и обновлять коллекции по id, поддерживать сортировку и минимизировать ручной код для normalized state. Для маленьких одноразовых массивов выгода обычно невелика.',
    difficulty: 3,
    topics: ['RTK'],
  },
  {
    text: 'Зачем frontend-проекту bundler или dev server?',
    answer:
      'Он собирает модули, обрабатывает импорты и ассеты, запускает локальную разработку и даёт быстрый feedback через rebuild или HMR. Без него современный стек собирать и запускать заметно сложнее.',
    difficulty: 1,
    topics: ['Tooling'],
  },
  {
    text: 'Как code splitting связан с tooling и производительностью?',
    answer:
      'Tooling разбивает bundle на чанки и управляет их загрузкой. Грамотные split points уменьшают стартовый payload, но слишком мелкая нарезка создаёт лишние запросы и накладные расходы.',
    difficulty: 3,
    topics: ['Tooling', 'Performance'],
  },
  {
    text: 'Как обычно организуют Zustand store, чтобы он не превратился в свалку?',
    answer:
      'Обычно состояние делят по доменным slice-ам, выносят actions рядом с данными и читают store через узкие selectors. Это уменьшает связанность и число лишних ререндеров.',
    difficulty: 2,
    topics: ['Zustand'],
  },
  {
    text: 'Почему server state редко стоит хранить напрямую в Zustand?',
    answer:
      'Для server state нужны кэширование, stale-логика, retries, background refetch и invalidation. В Zustand это придётся реализовывать вручную, поэтому чаще лучше держать там только клиентский state, а данные сервера отдать специализированному слою.',
    difficulty: 3,
    topics: ['Zustand', 'Server State'],
  },
];

module.exports = {
  questionBank,
};
