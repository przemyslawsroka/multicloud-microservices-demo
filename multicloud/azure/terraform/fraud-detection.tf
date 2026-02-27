# analytics.tf - Azure Fraud Detection Service Infrastructure

# Configure Terraform providers for Azure and for generating a random password
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.0"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.1"
    }
  }
}

variable "subscription_id" {
  description = "The Azure subscription ID where resources will be created"
  type        = string
}

# Configure the Azure Provider
provider "azurerm" {
  subscription_id = var.subscription_id
  features {}
}

# 1. Create a resource group to hold all our resources
resource "azurerm_resource_group" "rg" {
  name     = "tf-fraud-service-rg"
  location = "West Europe" # You can change this to a region closer to you
}

# 2. Create the networking infrastructure
resource "azurerm_virtual_network" "vnet" {
  name                = "fraud-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
}

resource "azurerm_subnet" "subnet" {
  name                 = "fraud-subnet"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.1.0/24"]
}

resource "azurerm_public_ip" "pip" {
  name                = "fraud-pip"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  allocation_method   = "Static"
  sku                 = "Standard"
}

# 3. Create a network security group (firewall) to allow HTTP on port 8080
resource "azurerm_network_security_group" "nsg" {
  name                = "fraud-nsg"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  security_rule {
    name                       = "AllowHTTP"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "8080"
    source_address_prefix      = "Internet"
    destination_address_prefix = "*"
  }
}

# 4. Create a network interface to connect the VM to the network
resource "azurerm_network_interface" "nic" {
  name                = "fraud-nic"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.subnet.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.pip.id
  }
}

resource "azurerm_network_interface_security_group_association" "nsg_assoc" {
  network_interface_id      = azurerm_network_interface.nic.id
  network_security_group_id = azurerm_network_security_group.nsg.id
}

# Generate a random password for the VM admin user
resource "random_password" "password" {
  length           = 16
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# 5. Create the Linux Virtual Machine
resource "azurerm_linux_virtual_machine" "vm" {
  name                            = "fraud-service-vm"
  resource_group_name             = azurerm_resource_group.rg.name
  location                        = azurerm_resource_group.rg.location
  size                            = "Standard_B1s" # A cheap, burstable VM size
  admin_username                  = "azureuser"
  admin_password                  = random_password.password.result
  disable_password_authentication = false

  network_interface_ids = [
    azurerm_network_interface.nic.id,
  ]

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts"
    version   = "latest"
  }

  # This startup script is Base64 encoded by Terraform and run on first boot
  custom_data = filebase64("${path.module}/../fraud-detection-service/startup.sh")
}

# 6. Output the public IP address and the full application URL
output "public_ip" {
  value       = azurerm_public_ip.pip.ip_address
  description = "The public IP address of the fraud detection server."
}

output "application_url" {
  value       = "http://${azurerm_public_ip.pip.ip_address}:8080/metrics"
  description = "The URL to access the metrics endpoint."
}