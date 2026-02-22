from tkinter import Tk, Frame, Button
root = Tk()
def print():
    frame = Frame(root)
    frame.pack(expand=True, fill="both")
    
    print("Button was clicked!")
def make_a_button():
    
    root.title("Warpspeed Test Window")
    root.geometry("400x300")

    frame = Frame(root)
    frame.pack(expand=True, fill="both")


    # Connect the function directly to the button here
    button = Button(frame, text="Geek", command=print)
    button.pack(pady=20)

    # This starts the window; code below this won't run until you exit
    root.mainloop()


make_a_button()



