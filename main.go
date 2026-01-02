package main

import (
	"fmt"

	"github.com/joho/godotenv"
)

// This function makes loopkups in map and returns the data of selected
func findData() {

}

func main() {
	err := godotenv.Load()
	if err != nil {
		fmt.Errorf("Didn't find ENV FILE")
		return
	}
	fmt.Println("I did not get any error in loading the file.\nAlthow now i am not sure what i am holding right now")
	//Change the file name to your env
	envData, err := godotenv.Read(".env.example")
	if err != nil {
		fmt.Errorf("Error Reading env File")
	}
	fmt.Println(envData)
}
