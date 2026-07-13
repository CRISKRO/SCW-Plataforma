async function test() {
  const res = await fetch('https://scw-plataforma-1.onrender.com/api/events/events/');
  const json = await res.json();
  console.log(json.map(e => ({ id: e.id, title: e.title })));
}
test();
