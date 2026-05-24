import './style.css'

const app = document.querySelector('#app')

app.innerHTML = `
  <main class="container">
    <h1>Plant Monitoring UI</h1>
    <p>Frontend is running. Next step is wiring this up to your device/API.</p>

    <section class="card">
      <h2>Status</h2>
      <dl class="grid">
        <div>
          <dt>Device</dt>
          <dd>—</dd>
        </div>
        <div>
          <dt>Soil moisture</dt>
          <dd>—</dd>
        </div>
        <div>
          <dt>Pump</dt>
          <dd>—</dd>
        </div>
        <div>
          <dt>Last update</dt>
          <dd>—</dd>
        </div>
      </dl>
    </section>
  </main>
`
