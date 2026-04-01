import { Counter } from './components';

export function App() {
  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Counter Component Demo</h1>

      <section style={{ marginTop: '24px' }}>
        <h2>Default Counter (starts at 0)</h2>
        <Counter />
      </section>

      <section style={{ marginTop: '24px' }}>
        <h2>Counter starting at 10</h2>
        <Counter initialValue={10} />
      </section>

      <section style={{ marginTop: '24px' }}>
        <h2>Counter with custom aria-label</h2>
        <Counter initialValue={5} ariaLabel="Item quantity" />
      </section>
    </div>
  );
}
