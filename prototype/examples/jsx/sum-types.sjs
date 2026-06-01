// Sum Types in JSX Props and State

type LoadingState<T> =
  | Loading
  | Loaded { data: T }
  | Failed { error: string }

// Props using sum type
interface DataCardProps<T> {
  state: LoadingState<T>
  renderData: (data: T) => JSX.Element
}

function DataCard<T>(props: DataCardProps<T>): JSX.Element {
  match props.state {
    Loading => (
      <div className="loading">
        <span>Loading...</span>
      </div>
    )
    Loaded { data } => (
      <div className="loaded">
        {props.renderData(data)}
      </div>
    )
    Failed { error } => (
      <div className="error">
        <strong>Error:</strong> {error}
      </div>
    )
  }
}

// Using Result<T,E> in props
type Result<T, E> = | Ok(T) | Err(E)

interface FormFieldProps {
  label: string
  value: string
  validation: Result<string, string>
  onChange: (value: string) => void
}

function FormField(props: FormFieldProps): JSX.Element {
  const isValid = match props.validation {
    Ok(_) => true
    Err(_) => false
  }
  const errorMsg = match props.validation {
    Ok(_) => null
    Err(msg) => msg
  }
  return (
    <div className={isValid ? 'field valid' : 'field invalid'}>
      <label>{props.label}</label>
      <input
        value={props.value}
        onChange={(e: dynamic) => props.onChange(e.target.value)}
      />
      {errorMsg !== null && <span className="error">{errorMsg}</span>}
    </div>
  )
}

// Sum type for button variants
type ButtonVariant = | Primary | Secondary | Danger

interface ButtonProps {
  variant: ButtonVariant
  label: string
  onClick: () => void
  disabled?: boolean
}

function Button(props: ButtonProps): JSX.Element {
  const className = match props.variant {
    Primary => 'btn btn-primary'
    Secondary => 'btn btn-secondary'
    Danger => 'btn btn-danger'
  }
  return (
    <button
      className={className}
      onClick={props.onClick}
      disabled={props.disabled ?? false}
    >
      {props.label}
    </button>
  )
}

// Demo app
function App(): JSX.Element {
  const userState: LoadingState<{ name: string; email: string }> = Loaded({
    data: { name: 'Alice', email: 'alice@example.com' }
  })

  return (
    <div>
      <DataCard
        state={userState}
        renderData={(user) => (
          <div>
            <h2>{user.name}</h2>
            <p>{user.email}</p>
          </div>
        )}
      />
      <Button variant={Primary()} label="Save" onClick={() => console.log('saved')} />
      <Button variant={Danger()} label="Delete" onClick={() => console.log('deleted')} />
    </div>
  )
}

export default App
